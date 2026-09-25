// Temporary narration generator for demo video
import { getCorsHeaders } from "../_shared/cors.ts";
import { anonClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // This calls a metered, paid third-party API (ElevenLabs) and had neither
  // an auth check nor a rate limit -- anyone who found the URL could run up
  // an unbounded bill. Require a real session and bound both rate and length.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const { data: authData, error: authErr } = await anonClient().auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !authData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rl = await checkRateLimit(clientKey(req, "tts-narration"), { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Please slow down." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { text, voice = "21m00Tcm4TlvDq8ikWAM", stability = 0.42, style = 0.55, similarity_boost = 0.85 } = await req.json();
  if (!text || typeof text !== "string" || text.length > 5000) {
    return new Response(JSON.stringify({ error: "text is required and must be 5000 characters or fewer" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return new Response("no key", { status: 500 });
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability, similarity_boost, style, use_speaker_boost: true, speed: 1.0 },
    }),
  });
  if (!r.ok) return new Response(await r.text(), { status: r.status });
  return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
});
