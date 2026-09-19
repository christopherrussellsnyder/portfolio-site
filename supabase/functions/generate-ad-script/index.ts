import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";
import { loadBrandKit, recentTreatments, normalizePlan } from "../_shared/ad-production.ts";
import { buildAdCtx, gatherAdIntel, normalizeAdPlatform } from "../_shared/ad-intel.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-2.5-flash";

type HookAngle = "intelligence" | "time" | "money" | "auto";

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Authentication required", code: "UNAUTHENTICATED" }, 401);
  }

  const rl = await checkRateLimit(clientKey(req, "ad-script"), { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return json({ error: "Too many requests. Please slow down." }, 429);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: "Invalid session", code: "UNAUTHENTICATED" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const {
      angle = "auto",
      durationSeconds = 30,
      count = 3,
      promoCode,
      promoDetail,
      customBrief,
      workspaceId,
      strategyPostId,
      platform,
    } = (body ?? {}) as {
      angle?: HookAngle;
      durationSeconds?: number;
      count?: number;
      promoCode?: string;
      promoDetail?: string;
      customBrief?: string;
      workspaceId?: string;
      strategyPostId?: string;
      platform?: string;
    };


    if (typeof customBrief === "string" && customBrief.length > 4000) {
      return json({ error: "Brief is too long." }, 400);
    }
    const variantCount = Math.min(Math.max(Number(count) || 3, 1), 5);
    const seconds = Math.min(Math.max(Number(durationSeconds) || 30, 15), 60);

    // ---- Business context grounding -------------------------------------
    let contextBlock = "";
    let promotionsBlock = "";
    let businessContextRow: any = null;
    try {
      let ctxQuery = supabase
        .from("business_context")
        .select("*")
        .eq("user_id", userId)
        .limit(1);
      if (workspaceId) ctxQuery = ctxQuery.eq("workspace_id", workspaceId);
      const { data: ctx } = await ctxQuery.maybeSingle();
      businessContextRow = ctx;

      if (ctx) {
        contextBlock = `
BUSINESS CONTEXT (ground every claim in this — never invent facts):
${JSON.stringify(ctx, null, 2)}`;
      }

      const { data: promos } = await supabase
        .from("business_promotions")
        .select("title, description, discount_value, promo_code, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(5);

      if (promos?.length) {
        promotionsBlock = `
ACTIVE PROMOTIONS (weave the strongest one into the mid-roll and close):
${JSON.stringify(promos, null, 2)}`;
      }
    } catch (e) {
      console.error("[ad-script] context load failed (non-fatal):", e);
    }

    // ---- Strategy-day linkage ------------------------------------------
    // Production elements only earn their place when the day's post calls for
    // them. Without a linked post we deliberately stay closer to a clean read.
    let strategyBlock = "";
    let linkedPost: any = null;
    if (strategyPostId) {
      try {
        const { data: post } = await supabase
          .from("strategy_posts")
          .select(
            "day_number, post_type, theme, hook, caption, cta, content_pillar, primary_emotion, hook_technique, visual_guidance, week_theme",
          )
          .eq("id", strategyPostId)
          .maybeSingle();
        if (post) {
          linkedPost = post;
          strategyBlock = `
LINKED STRATEGY DAY (this ad must be the video expression of THIS post — same promise, same emotion, same angle):
${JSON.stringify(post, null, 2)}`;
        }
      } catch (e) {
        console.error("[ad-script] strategy post load failed (non-fatal):", e);
      }
    }

    // ---- Brand kit + anti-repetition ------------------------------------
    const brandKit = await loadBrandKit(supabase, userId, workspaceId);
    const priorTreatments = await recentTreatments(supabase, userId);

    const brandBlock = `
BRAND KIT (design inspiration lifted from the advertiser's own website — every generated visual must look like it belongs to this brand):
${JSON.stringify(brandKit, null, 2)}`;

    const diversityBlock = priorTreatments.length
      ? `
RECENTLY SHIPPED TREATMENTS (do NOT repeat these looks — the market has already seen them from this advertiser):
${JSON.stringify(priorTreatments, null, 2)}`
      : "";


    // ---- Niche + performance intelligence (same engine as strategy gen) ---
    // Live platform signals, search demand, competitor ad recon, site crawl,
    // voice-of-customer and this advertiser's own proven results — reshaped
    // into art direction so the ad is built on evidence, not vibes.
    let intelBlock = "";
    let intelSources: string[] = [];
    let intelEvidence: {
      first_party: boolean;
      ai_estimated: boolean;
      calibrated_patterns: { pattern_type: string; pattern_value: string; error_pct: number; sample_size: number; avg_actual: number }[];
    } = { first_party: false, ai_estimated: false, calibrated_patterns: [] };
    let adPlatform = normalizeAdPlatform(platform || linkedPost?.platform);
    try {
      const [settingsRes, bizInfoRes] = await Promise.all([
        supabase.from("user_business_settings").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("business_information").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      const adCtx = buildAdCtx(settingsRes.data, bizInfoRes.data, businessContextRow);
      const intel = await gatherAdIntel(supabase, userId, adCtx, adPlatform);
      adPlatform = intel.platform;
      intelSources = intel.sources;
      intelEvidence = intel.evidence;
      intelBlock = intel.section
        ? `\nNICHE + PERFORMANCE INTELLIGENCE (evidence base for this ad — obey it):\n${intel.section}`
        : "";
      console.log("[ad-script] intel sources:", intelSources.join(", ") || "none");
    } catch (e) {
      console.error("[ad-script] intel gathering failed (non-fatal):", e);
    }


    const promoLine =
      promoCode || promoDetail
        ? `Explicit promo to feature: ${[promoDetail, promoCode ? `code ${promoCode}` : null]
            .filter(Boolean)
            .join(" — ")}`
        : promotionsBlock
          ? "Use the strongest active promotion listed above."
          : "No promo supplied. Use a soft value-based nudge instead of a discount, and leave promo fields as empty strings.";

    const angleInstruction =
      angle === "auto"
        ? `Produce ${variantCount} variants that each test a DIFFERENT hook angle. Rotate across these three families: (1) INTELLIGENCE — how the product's thinking/analysis beats guessing; (2) TIME — how much time it gives back; (3) MONEY — how much cost it removes vs agencies/freelancers.`
        : `Produce ${variantCount} variants that all attack the "${angle}" hook family, but with genuinely different opening lines and mechanics.`;

    const systemPrompt = `You are an elite direct-response UGC scriptwriter writing spoken video ad scripts for a single on-camera presenter.

STYLE BAR — this is non-negotiable:
Visually polished but conversationally relaxed. The presenter sounds like a sharp, credible person talking straight to camera — NOT a corporate announcer, NOT a hype-y guru. No exclamation marks. No "Are you tired of...". No "Introducing". No emojis. No stage directions or bracketed cues — output only words that are spoken aloud, because this text is fed directly to a text-to-speech engine.

MANDATORY STRUCTURE, in this exact order:
1. HOOK — one simple sentence that names the viewer's problem and implies the fix. This is where the ad lives or dies. It must be concrete and specific, never generic.
2. BENEFIT — how the product is specifically designed to benefit this viewer. Speak to outcome, not features.
3. MECHANISM — a very brief, plain explanation of how the product actually works. Two sentences maximum. Credibility, not a tour.
4. PROMO (mid-roll) — drop the offer here to hold attention through the middle.
5. CLOSE — restate the single strongest benefit, then repeat the promo and a clear next step.

PACING: roughly 2.4 spoken words per second. A ${seconds}-second script is about ${Math.round(seconds * 2.4)} words total. Respect this closely — going long gets the ad cut off.

${angleInstruction}

PRODUCTION DIRECTION — you are also the ad's art director, and the bar is a nationally-run brand campaign, not a webcam read.
For every variant, split the script into 3 to 5 scenes and decide, scene by scene, what the viewer should be LOOKING at:
- "avatar": presenter on a clean neutral set. Use it for the hook and for beats where the face carries the moment.
- "broll": a cinematic plate of the advertiser's real product/service in context, art-directed from their own website imagery.
- "text-card": a kinetic typographic frame carrying one short headline (max 6 words) — for a number, a claim, or the promo.
- "brand-color": a flat brand-coloured field from the brand kit. A palate cleanser, useful between two heavy visuals.

EDIT & CINEMATOGRAPHY — you are cutting this ad, not stacking slides. Every scene must also carry:
- "shot_type": "extreme-close" | "close-up" | "medium" | "wide" | "overhead" | "detail-insert" — vary it every cut. Two identical shot sizes back to back is a slideshow.
- "camera_move": "static" | "push-in" | "pull-out" | "pan" | "tilt" | "handheld" | "whip" — the hook almost always pushes in. Never repeat the same move on consecutive beats.
- "composition": "full-bleed" | "presenter-left" | "presenter-right" | "pip" | "split" — this decides where the presenter sits over the visual. Alternate sides across the ad so the frame keeps changing.
- "energy": "calm" | "steady" | "punchy" — the hook, promo and close run punchy; the mechanism can breathe.
- "duration_seconds": how long this beat is on screen, matching how long its "spoken" line takes to say at roughly 2.4 words per second. Hooks run 2-3s; no single beat runs longer than 8s.
- "text_position": "top" | "center" | "lower-third" — where the on-screen headline sits. Burned-in captions own the bottom of the frame, so use "lower-third" sparingly and never on a beat that already carries a long spoken line.
Also set "edit_style" on the production plan: one line describing the overall cut rhythm (e.g. "fast punch-in cuts with two wide breathers").
Design the cut like an editor: open tight and punchy, widen for the mechanism, then snap back tight for the promo and close.

HARD RULES:
- Every variant MUST contain at least TWO generated plates ("broll" or "text-card"). A flat all-presenter ad is below the production bar and is not acceptable.
- At most FOUR generated plates across the whole ad.
- Every scene must carry an "on_screen_text" headline (max 6 words, correctly spelled, a compression of what is spoken) so the ad still lands with the sound off.
- The scenes' "spoken" fields, concatenated in order, must equal the full script exactly — same words, nothing added or dropped.
- The HOOK beat is almost always "avatar": a face is the strongest scroll-stopper in the first two seconds.
- Any "broll" background_prompt must name the advertiser's real product/service, the physical environment it lives in, the lighting, and the brand palette. Never generic stock imagery, never abstract gradients.
- The PROMO and CLOSE beats should almost always be "text-card" so the offer is readable on a muted feed.
- Pick a treatment that is genuinely different from the recently shipped treatments listed by the advertiser. Repeating a look is how a brand becomes invisible.
- You have been handed a NICHE + PERFORMANCE INTELLIGENCE brief built from live platform signals, search demand, competitor ad recon, the advertiser's own website, customer voice, and their historical results. Ground the hook, the mechanism, the on-screen text and every visual in that evidence. An ad that ignores it is a rejected ad.
- Obey the platform production spec in that brief (aspect ratio, hook timing, cut rhythm, sound-off readability) — the ad runs on ${adPlatform.toUpperCase()}.
${strategyBlock ? "- This ad is tied to a specific strategy day. The visual treatment must express THAT post's theme, emotion and pillar — not a generic brand film." : ""}


EDIT RECOMMENDATIONS — the ad is delivered as a CLEAN MASTER (presenter, voice, correct dimensions, nothing else) and the advertiser finishes it in an editor. So for every variant you must also return "edit_recommendations": specific, evidence-backed instructions for HOW to cut this exact ad on ${adPlatform.toUpperCase()}. Derive them from the NICHE + PERFORMANCE INTELLIGENCE brief — cut cadence, first-two-second retention move, caption treatment, on-screen text density, sound-off readability, music energy, and where the offer card sits. Write them so a complete beginner who has never edited a video could follow them literally. No jargon without a plain-language explanation. Name the evidence in one line.

EVIDENCE HONESTY — you must also set "basis" on the edit recommendations, and you must be truthful:
- "measured" — the call is taken from this advertiser's own measured results or the CALIBRATED CREATIVE PERFORMANCE block (real predicted-vs-actual data).
- "niche_calibrated" — the call comes from the niche-level calibrated patterns but not this advertiser's own numbers.
- "best_practice" — the call is general craft knowledge you are applying. This is the DEFAULT. If the brief contains no measured data supporting a call, you must say "best_practice". Never claim "measured" to sound more authoritative — a false claim of measurement is the worst possible failure here.

Return ONLY valid JSON, no markdown fences.

Schema:
{
  "variants": [
    {
      "angle": "intelligence" | "time" | "money",
      "title": "<short internal label, max 6 words>",
      "hook": "<the single opening sentence, verbatim from the script>",
      "script": "<the FULL spoken script, plain prose, all five beats flowing naturally as one continuous read>",
      "estimated_seconds": <number>,
      "why_it_works": "<one sentence on the psychological mechanic>",
      "production_plan": {
        "treatment": "talking-head" | "product-showcase" | "text-driven" | "hybrid",
        "rationale": "<one sentence on why this treatment fits this script and this day>",
        "captions": true,
        "edit_style": "<one line on the overall cut rhythm>",
        "edit_recommendations": {
          "cut_rhythm": "<how often to cut, in plain language>",
          "hook_retention": "<what must happen in the first 2 seconds on this platform>",
          "caption_style": "<caption size, placement and styling>",
          "text_density": "<how much on-screen text winners in this niche use>",
          "sound": "<music/sound-off guidance>",
          "cta_treatment": "<where the offer card sits and how long it holds>",
          "do_this": ["<concrete editor move>", "<concrete editor move>"],
          "avoid": ["<mistake that kills performance in this niche>"],
          "evidence": "<one line naming the evidence these calls came from>",
          "basis": "measured" | "niche_calibrated" | "best_practice"
        },
        "scenes": [
          {
            "role": "hook" | "benefit" | "mechanism" | "promo" | "close",
            "spoken": "<exact words spoken in this scene>",
            "visual": "avatar" | "broll" | "text-card" | "brand-color",
            "background_prompt": "<art direction, only for broll>",
            "on_screen_text": "<max 6 words, only for text-card>",
            "background_color": "<hex from the brand kit, only for brand-color>",
            "shot_type": "extreme-close" | "close-up" | "medium" | "wide" | "overhead" | "detail-insert",
            "camera_move": "static" | "push-in" | "pull-out" | "pan" | "tilt" | "handheld" | "whip",
            "composition": "full-bleed" | "presenter-left" | "presenter-right" | "pip" | "split",
            "energy": "calm" | "steady" | "punchy",
            "duration_seconds": <number>,
            "text_position": "top" | "center" | "lower-third"
          }
        ]
      }
    }
  ]
}`;

    const userPrompt = `${contextBlock}
${promotionsBlock}
${strategyBlock}
${brandBlock}
${intelBlock}
${diversityBlock}

${promoLine}

Target spoken length: ${seconds} seconds.
${customBrief ? `\nAdditional direction from the advertiser:\n${customBrief}` : ""}

Write the ${variantCount} script variants, each with its production plan, now.`;


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error(`[ad-script] gateway failed [${aiRes.status}]: ${errText}`);
      if (aiRes.status === 429) {
        return json({ error: "The AI is busy right now. Try again in a moment.", code: "RATE_LIMITED" }, 429);
      }
      if (aiRes.status === 402) {
        return json(
          { error: "AI credits are temporarily unavailable. Please try again shortly.", code: "AI_CREDITS_DEPLETED" },
          402,
        );
      }
      return json({ error: "Could not generate scripts right now." }, 502);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let parsed: { variants?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Resilient extraction — strip fences / prose around the JSON.
      const match = String(raw).match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { variants: [] };
    }

    const rawVariants = Array.isArray(parsed.variants) ? parsed.variants : [];
    if (!rawVariants.length) {
      return json({ error: "The script engine returned nothing usable. Please try again." }, 502);
    }

    // Sanitise the art direction: caps generated plates, drops malformed scenes,
    // and falls back to a clean read when the model gives us nothing usable.
    // The evidence block is attached server-side so the UI can label each
    // recommendation honestly instead of trusting the model's own claim.
    const allowedBasis = new Set(["measured", "niche_calibrated", "best_practice"]);
    const variants = rawVariants.map((v) => {
      const variant = (v ?? {}) as Record<string, unknown>;
      const script = String(variant.script ?? "");
      const plan = normalizePlan(variant.production_plan, script) as Record<string, any>;

      // Downgrade any basis the evidence we actually gathered cannot support.
      const recs = plan.edit_recommendations as Record<string, any> | undefined;
      if (recs) {
        let basis = String(recs.basis ?? "best_practice");
        if (!allowedBasis.has(basis)) basis = "best_practice";
        if (basis === "measured" && !intelEvidence.first_party) {
          basis = intelEvidence.calibrated_patterns.length ? "niche_calibrated" : "best_practice";
        }
        if (basis === "niche_calibrated" && !intelEvidence.calibrated_patterns.length) {
          basis = "best_practice";
        }
        recs.basis = basis;
      }

      plan.evidence = intelEvidence;
      return { ...variant, production_plan: plan };
    });

    return json({
      variants,
      brand_kit: brandKit,
      intel_sources: intelSources,
      platform: adPlatform,
      evidence: intelEvidence,
    });


  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ad-script] ERROR:", message);
    return json({ error: message }, 500);
  }
});
