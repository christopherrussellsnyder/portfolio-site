// Temporary narration generator for demo video
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  const { text, voice = "21m00Tcm4TlvDq8ikWAM", stability = 0.42, style = 0.55, similarity_boost = 0.85 } = await req.json();
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
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Access-Control-Allow-Origin": "*" } });
});
