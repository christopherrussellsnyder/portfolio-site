import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { resolveVideoQuota, videoCorsHeaders as corsHeaders } from "../_shared/video-quota.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";
import { createHeygenVideo, ASPECT_DIMENSIONS, type RenderScene } from "../_shared/heygen.ts";
import {
  formatSpec,
  normalizePlan,
  type AdScene,
} from "../_shared/ad-production.ts";

const MAX_SCRIPT_CHARS = 3000;


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

  // Rendering is expensive — keep the ceiling tight and well below the plan quota.
  const rl = await checkRateLimit(clientKey(req, "video-ad-generate"), { limit: 6, windowMs: 60_000 });
  if (!rl.ok) {
    return json({ error: "Too many render requests. Please wait a moment." }, 429);
  }

  const gate = await resolveVideoQuota(req, { enforce: true });
  if (gate instanceof Response) return gate;
  const { userId, supabase, tier, limit, used } = gate;

  try {
    if (!Deno.env.get("HEYGEN_API_KEY")) {
      return json(
        {
          error: "Video generation isn't switched on yet. Please try again shortly.",
          code: "PROVIDER_NOT_CONFIGURED",
        },
        503,
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      script,
      hook,
      title,
      angle,
      avatarId,
      avatarName,
      avatarPreviewUrl,
      voiceId,
      aspectRatio = "9:16",
      workspaceId,
      strategyPostId,
      productionPlan,
    } = (body ?? {}) as Record<string, unknown> & { aspectRatio?: string };

    const asText = (v: unknown) => (typeof v === "string" ? v : undefined);
    const scriptText = asText(script);
    const avatarIdText = asText(avatarId);
    const voiceIdText = asText(voiceId);

    // ---- Validation -----------------------------------------------------
    if (!scriptText || !scriptText.trim()) {
      return json({ error: "A script is required." }, 400);
    }
    if (scriptText.length > MAX_SCRIPT_CHARS) {
      return json(
        { error: `Script is too long (${scriptText.length} characters). Keep it under ${MAX_SCRIPT_CHARS}.` },
        400,
      );
    }
    if (!avatarIdText) {
      return json({ error: "Please choose an actor." }, 400);
    }
    if (!voiceIdText) {
      return json({ error: "Please choose a voice." }, 400);
    }
    if (!ASPECT_DIMENSIONS[aspectRatio]) {
      return json({ error: "Unsupported aspect ratio." }, 400);
    }

    // ---- Stage 1: the shot list is the brief ----------------------------
    // The render stage deliberately produces a CLEAN MASTER: presenter, voice,
    // correct delivery dimensions and nothing else. No plates, no picture-in-
    // picture framing, no burned-in captions, no transitions. All editing now
    // happens in the Edit studio, so the master must stay untouched footage.
    formatSpec(aspectRatio); // validates the delivery format is known
    const plan = normalizePlan(productionPlan, scriptText.trim(), aspectRatio);

    // Beats are still passed through so the delivered master is cut at the same
    // boundaries as the edit brief — but every beat renders full-frame clean.
    const renderScenes: RenderScene[] = (plan.scenes as AdScene[]).map((scene) => ({
      text: scene.spoken,
    }));



    // ---- Kick off the render -------------------------------------------
    let providerVideoId: string;
    try {
      providerVideoId = await createHeygenVideo({
        script: scriptText.trim(),
        avatarId: avatarIdText,
        voiceId: voiceIdText,
        aspectRatio,
        scenes: renderScenes,
        // Captions are an edit decision — they get added in the Edit studio,
        // burned into a clean master rather than baked in at render time.
        captions: false,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const status = (err as { heygen?: { status: number } })?.heygen?.status;
      console.error(`[video-ad] HeyGen create failed: ${detail}`);

      if (status === 401 || status === 403) {
        return json(
          { error: "Video provider credentials were rejected. Support has been notified.", details: detail },
          502,
        );
      }
      if (status === 429) {
        return json({ error: "The video provider is at capacity. Try again in a minute." }, 429);
      }
      return json({ error: "Could not start the render.", details: detail }, 502);
    }

    // ---- Record it ------------------------------------------------------
    // The linked day's prediction is copied onto the ad so the nightly outcome
    // job has something to compare the real numbers against.
    let predictedEngagement: number | null = null;
    if (asText(strategyPostId)) {
      const { data: linked } = await supabase
        .from("strategy_posts")
        .select("predicted_engagement")
        .eq("id", asText(strategyPostId))
        .maybeSingle();
      predictedEngagement = linked?.predicted_engagement ?? null;
    }

    const { data: row, error: insertError } = await supabase
      .from("video_ads")
      .insert({
        user_id: userId,
        workspace_id: asText(workspaceId) ?? null,
        strategy_post_id: asText(strategyPostId) ?? null,
        predicted_engagement: predictedEngagement,

        title: asText(title) ?? null,
        hook: asText(hook) ?? null,
        script: scriptText.trim(),
        angle: asText(angle) ?? null,
        provider: "heygen",
        provider_video_id: providerVideoId,
        avatar_id: avatarIdText,
        avatar_name: asText(avatarName) ?? null,
        avatar_preview_url: asText(avatarPreviewUrl) ?? null,
        voice_id: voiceIdText,
        aspect_ratio: aspectRatio,
        status: "processing",
        counts_against_quota: true,
        treatment: plan.treatment,
        scene_count: plan.scenes.length,
        production_plan: { ...plan, assets: [] },
      })
      .select("id, status, created_at")
      .single();


    if (insertError) {
      console.error("[video-ad] insert failed:", insertError.message);
      return json({ error: "Render started but could not be saved. Please contact support." }, 500);
    }

    // ---- Register the creative in the A/B framework ----------------------
    // Ads generated against the same strategy day are competing creatives, so
    // they join one experiment and get settled on measured performance rather
    // than on the model's own opinion of which script is best.
    let abTestId: string | null = null;
    let abVariantId: string | null = null;
    try {
      const postId = asText(strategyPostId) ?? null;

      if (postId) {
        const { data: existing } = await supabase
          .from("ab_tests")
          .select("id")
          .eq("user_id", userId)
          .eq("variable_being_tested", "creative")
          .eq("status", "running")
          .ilike("description", `%${postId}%`)
          .maybeSingle();
        abTestId = existing?.id ?? null;
      }

      if (!abTestId) {
        const { data: test } = await supabase
          .from("ab_tests")
          .insert({
            user_id: userId,
            name: `Creative test — ${asText(title) ?? asText(hook) ?? "video ad"}`.slice(0, 80),
            description: postId ? `strategy_post:${postId}` : "standalone creative test",
            variable_being_tested: "creative",
            hypothesis: "Treatment, opening shot and text density change how this ad performs.",
            status: "running",
            start_date: new Date().toISOString(),
          })
          .select("id")
          .single();
        abTestId = test?.id ?? null;
      }

      if (abTestId) {
        const { count } = await supabase
          .from("ab_test_variants")
          .select("id", { count: "exact", head: true })
          .eq("ab_test_id", abTestId);

        const { data: variant } = await supabase
          .from("ab_test_variants")
          .insert({
            ab_test_id: abTestId,
            variant_name: (asText(title) ?? `${plan.treatment} cut`).slice(0, 60),
            is_control: (count ?? 0) === 0,
            content_template: scriptText.trim().slice(0, 4000),
            variable_value: { angle: asText(angle) ?? null, treatment: plan.treatment },
            video_ad_id: row.id,
            creative_signature: {
              treatment: plan.treatment,
              opening_shot: plan.scenes?.[0]?.shot_type ?? null,
              scene_count: plan.scenes.length,
              captions: plan.captions ?? null,
              aspect_ratio: aspectRatio,
            },
          })
          .select("id")
          .single();
        abVariantId = variant?.id ?? null;

        await supabase
          .from("video_ads")
          .update({ ab_test_id: abTestId, ab_variant_id: abVariantId })
          .eq("id", row.id);
      }
    } catch (e) {
      // Experiment bookkeeping must never block a paid render.
      console.error("[video-ad] A/B registration failed (non-fatal):", e);
    }

    return json({
      id: row.id,
      status: row.status,
      ab_test_id: abTestId,
      ab_variant_id: abVariantId,
      quota: {
        tier,
        limit: limit === Number.POSITIVE_INFINITY ? null : limit,
        used: used + 1,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[video-ad] ERROR:", message);
    return json({ error: message }, 500);
  }
});
