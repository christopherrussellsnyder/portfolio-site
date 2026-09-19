import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { resolveVideoQuota, videoCorsHeaders as corsHeaders } from "../_shared/video-quota.ts";
import { listHeygenAvatars, listHeygenVoices } from "../_shared/heygen.ts";

// The actor catalog changes rarely; cache it project-wide to avoid burning
// provider rate limit on every page visit.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Browsing actors is allowed on every tier — the gate is on rendering.
  const gate = await resolveVideoQuota(req, { enforce: false });
  if (gate instanceof Response) return gate;
  const { supabase, tier, limit, used, remaining, isTrial } = gate;

  const quota = {
    tier,
    limit: limit === Number.POSITIVE_INFINITY ? null : limit,
    used,
    remaining: remaining === Number.POSITIVE_INFINITY ? null : remaining,
    is_trial: isTrial,
  };

  try {
    const body = await req.json().catch(() => ({}));
    const force = (body as { force?: boolean })?.force === true;

    const { data: cached } = await supabase
      .from("video_ad_avatars_cache")
      .select("payload, fetched_at")
      .eq("provider", "heygen")
      .maybeSingle();

    const fresh =
      cached?.fetched_at && Date.now() - new Date(cached.fetched_at as string).getTime() < CACHE_TTL_MS;

    if (cached && fresh && !force) {
      const payload = cached.payload as { actors?: unknown[]; voices?: unknown[] };
      return json({ ...payload, cached: true, quota });
    }

    if (!Deno.env.get("HEYGEN_API_KEY")) {
      // Serve stale rather than nothing if the key is temporarily absent.
      if (cached) {
        const payload = cached.payload as Record<string, unknown>;
        return json({ ...payload, cached: true, stale: true, quota });
      }
      return json(
        { error: "Video generation isn't switched on yet.", code: "PROVIDER_NOT_CONFIGURED", quota },
        503,
      );
    }

    const [actors, voices] = await Promise.all([listHeygenAvatars(), listHeygenVoices()]);
    const payload = { actors, voices };

    const { error: upsertError } = await supabase
      .from("video_ad_avatars_cache")
      .upsert(
        { provider: "heygen", payload, fetched_at: new Date().toISOString() },
        { onConflict: "provider" },
      );
    if (upsertError) {
      console.error("[list-ad-actors] cache upsert failed:", upsertError.message);
    }

    return json({ ...payload, cached: false, quota });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[list-ad-actors] ERROR:", message);
    return json({ error: "Could not load the actor library.", details: message, quota }, 502);
  }
});
