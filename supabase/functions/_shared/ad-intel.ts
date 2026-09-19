// ============================================================================
// Ad Intelligence Layer
// Reuses the exact same external-truth + performance grounding that powers
// strategy generation, reshaped into art-direction / script direction for the
// video ad generator. Every source degrades gracefully and is cached in
// `strategy_intel_cache`, so ad generation costs nothing extra when a strategy
// was already generated in the same niche.
// ============================================================================

import {
  fetchSearchDemand,
  fetchCompetitorAds,
  crawlBusinessSite,
  fetchVoiceOfCustomer,
} from "./strategy-intel.ts";

/** A creative choice that has been measured against real outcomes for this niche. */
export interface CalibratedCreativePattern {
  pattern_type: string;
  pattern_value: string;
  error_pct: number;
  sample_size: number;
  avg_actual: number;
}

/**
 * Provenance of the evidence behind an ad's creative direction, so the UI can
 * be honest about which recommendations are measured and which are model priors.
 */
export interface AdEvidence {
  first_party: boolean;
  ai_estimated: boolean;
  calibrated_patterns: CalibratedCreativePattern[];
}

export interface AdIntel {
  section: string;
  sources: string[];
  platform: string;
  evidence: AdEvidence;
}


export function normalizeAdPlatform(p?: string): string {
  const s = (p || "").toLowerCase();
  if (s.includes("insta") || s.includes("facebook") || s.includes("meta")) return "meta";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("youtube") || s.includes("shorts")) return "youtube";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("google")) return "google";
  return "meta";
}

interface Ctx {
  businessName: string;
  industry: string;
  products: string;
  competitors: string;
  geoFocus: string;
  website: string;
  audience: string;
  uvp: string;
}

export function buildAdCtx(settings: any, businessInfo: any, businessContext: any): Ctx {
  const us = settings || {};
  const bi = businessInfo || {};
  const bp = businessContext?.business_profile || {};
  const geo = Array.isArray(bi.geographic_focus) ? bi.geographic_focus.join(", ") : (us.geographic_focus || "");
  const age = bi.target_age_min && bi.target_age_max ? `Age ${bi.target_age_min}-${bi.target_age_max}` : "";
  const gd = bi.gender_distribution || {};
  const gender = (gd.male || gd.female) ? `Male ${gd.male || 0}% / Female ${gd.female || 0}%` : "";

  return {
    businessName: us.business_name || bi.business_name || bp.businessName || "the advertiser",
    industry: us.industry || bi.industry || bp.industry || "general",
    products:
      (Array.isArray(us.products_services) ? us.products_services.join(", ") : "") ||
      bi.primary_products_services ||
      "",
    competitors:
      (Array.isArray(us.competitors) ? us.competitors.join(", ") : "") ||
      (Array.isArray(bi.top_competitors) ? bi.top_competitors.map((c: any) => c.name || c).join(", ") : "") ||
      "",
    geoFocus: geo,
    website: bi.website || us.website || "",
    audience: [age, gender, bi.income_level && `Income ${bi.income_level}`, bi.buying_behavior]
      .filter(Boolean)
      .join(" | "),
    uvp: us.unique_value_proposition || bi.unique_value_proposition || "",
  };
}

/**
 * Gathers live niche intelligence + this advertiser's proven performance data
 * and renders it as creative direction the script/art model can act on.
 */
export async function gatherAdIntel(
  supabase: any,
  userId: string,
  ctx: Ctx,
  platformRaw?: string,
): Promise<AdIntel> {
  const platform = normalizeAdPlatform(platformRaw);
  const niche = (ctx.industry || "general").toLowerCase().trim();
  const sources: string[] = [];
  const blocks: string[] = [];

  const [
    signalsRes,
    searchIntel,
    adIntel,
    siteIntel,
    vocIntel,
    topPostsRes,
    patternsRes,
    baselineRes,
    hooksRes,
    calibrationRes,
  ] = await Promise.all([
      supabase
        .from("campaign_intelligence_signals")
        .select("*")
        .eq("platform", platform)
        .in("niche", [niche, "general"])
        .order("refreshed_at", { ascending: false })
        .limit(2),
      fetchSearchDemand(supabase, ctx.industry, ctx.products, ctx.geoFocus).catch(() => null),
      fetchCompetitorAds(supabase, ctx.industry, ctx.competitors, platform, ctx.geoFocus).catch(() => null),
      crawlBusinessSite(supabase, ctx.website).catch(() => null),
      fetchVoiceOfCustomer(supabase, ctx.industry, ctx.products).catch(() => null),
      supabase.rpc("get_top_performing_posts", { p_user_id: userId, p_platform: platform, p_limit: 5 }).catch(() => ({ data: [] })),
      supabase
        .from("content_performance_patterns")
        .select("pattern_type,pattern_value,avg_engagement_rate,post_count")
        .eq("user_id", userId)
        .order("performance_score", { ascending: false })
        .limit(12),
      supabase.rpc("get_user_baseline_metrics", { p_user_id: userId, p_platform: platform }).catch(() => ({ data: [] })),
      supabase.rpc("get_top_performing_elements", { p_user_id: userId, p_element_type: "hooks", p_limit: 6 }).catch(() => ({ data: [] })),
      // Creative choices already measured against real outcomes in this niche.
      supabase
        .from("niche_calibration")
        .select("pattern_type,pattern_value,error_pct,sample_size,avg_actual")
        .eq("niche", niche)
        .eq("is_calibrated", true)
        .like("pattern_type", "creative_%")
        .order("sample_size", { ascending: false })
        .limit(10)
        .then((r: any) => r, () => ({ data: [] })),
    ]);


  // ---- AI-estimated platform trend (model priors, NOT live platform data) ----
  const signals = signalsRes?.data || [];
  if (signals.length) {
    const lines = signals.map(
      (s: any) =>
        `- ${String(s.platform).toUpperCase()} / ${s.niche}: ${s.recommended_structure} estimated to outperform (model confidence ${s.confidence_score}/10). Directional ROAS view: ${s.roas_trend || "n/a"}. Creative volume norm: ${s.creative_volume || "n/a"}. Audience approach: ${s.audience_approach || "n/a"}. Rationale: ${s.rationale || ""}`,
    );
    blocks.push(
      `=== AI-ESTIMATED ${platform.toUpperCase()} TREND (NOT LIVE DATA — model priors only, lowest confidence tier) ===\n${lines.join("\n")}\n\nTranslate this into creative decisions: pacing, hook length, how fast the offer lands, and how many distinct creative variants are needed to feed the recommended campaign structure. Never state these estimates to the end user as measured platform performance.`,
    );
    sources.push("campaign_intelligence_signals (ai_estimated)");
  }


  for (const r of [siteIntel, searchIntel, adIntel, vocIntel]) {
    if (r?.ok && r.section) {
      blocks.push(r.section);
      sources.push(r.source);
    }
  }

  // ---- This advertiser's proven performance ----
  const topPosts = topPostsRes?.data || [];
  const patterns = patternsRes?.data || [];
  const baseline = (baselineRes?.data && baselineRes.data[0]) || null;
  const hooks = hooksRes?.data || [];

  const perf: string[] = [];
  if (baseline) {
    perf.push(
      `- Baseline on ${platform} (last 90 days): ${Number(baseline.avg_engagement_rate || 0).toFixed(2)}% avg engagement across ${baseline.total_posts || 0} posts. The ad must be built to beat this, not match it.`,
    );
  }
  const bestByType: Record<string, any> = {};
  for (const p of patterns) {
    const t = p.pattern_type;
    if (!bestByType[t] || (p.avg_engagement_rate || 0) > (bestByType[t].avg_engagement_rate || 0)) bestByType[t] = p;
  }
  for (const [t, p] of Object.entries(bestByType)) {
    perf.push(
      `- Proven ${t.replace(/_/g, " ")}: "${p.pattern_value}" — ${Number(p.avg_engagement_rate || 0).toFixed(2)}% avg engagement over ${p.post_count} posts.`,
    );
  }
  if (hooks.length) {
    perf.push(
      `- Highest-performing hook patterns for this audience: ${hooks
        .slice(0, 5)
        .map((h: any) => `"${String(h.element).slice(0, 80)}"`)
        .join(", ")}. Mirror the mechanic, never the wording.`,
    );
  }
  if (topPosts.length) {
    perf.push(
      `- Top performing posts (study the opening beat, then out-write it):\n${topPosts
        .slice(0, 3)
        .map(
          (p: any, i: number) =>
            `  ${i + 1}. [${Number(p.engagement_rate || 0).toFixed(2)}%] "${String(p.content || "").replace(/\s+/g, " ").slice(0, 140)}"`,
        )
        .join("\n")}`,
    );
  }
  const firstParty = perf.length > 0;
  if (firstParty) {
    blocks.push(
      `=== FIRST-PARTY PROVEN PERFORMANCE (THIS ADVERTISER'S OWN MEASURED AUDIENCE DATA — HIGHEST CONFIDENCE, OVERRIDES AI-ESTIMATED TRENDS ABOVE) ===\n${perf.join("\n")}`,
    );
    sources.push("performance_feedback_loop (first_party)");
  }

  // ---- Calibrated creative choices (measured predicted-vs-actual, same loop as hooks) ----
  const calibrated = ((calibrationRes?.data || []) as any[]).map((c) => ({
    pattern_type: String(c.pattern_type),
    pattern_value: String(c.pattern_value),
    error_pct: Number(c.error_pct) || 0,
    sample_size: Number(c.sample_size) || 0,
    avg_actual: Number(c.avg_actual) || 0,
  })) as CalibratedCreativePattern[];

  if (calibrated.length) {
    const calLines = calibrated.map((c) => {
      const label = c.pattern_type.replace("creative_", "").replace(/_/g, " ");
      const drift =
        c.error_pct > 0
          ? `historically UNDER-predicted by ~${Math.abs(c.error_pct).toFixed(0)}% (it beats expectations)`
          : `historically OVER-predicted by ~${Math.abs(c.error_pct).toFixed(0)}% (it disappoints)`;
      return `- ${label} = "${c.pattern_value}": measured ${c.avg_actual.toFixed(2)}% avg engagement over ${c.sample_size} shipped ads; ${drift}.`;
    });
    blocks.push(
      `=== CALIBRATED CREATIVE PERFORMANCE (MEASURED PREDICTED-VS-ACTUAL FOR THIS NICHE — TREAT AS FACT, NOT OPINION) ===\n${calLines.join("\n")}\n\nFavour the creative choices that beat expectations and avoid the ones that consistently disappoint. If you deliberately go against a calibrated pattern, say why in "why_it_works".`,
    );
    sources.push("niche_calibration (first_party)");
  }


  // ---- Platform-native production spec ----
  blocks.push(platformSpec(platform));

  blocks.push(`=== HOW TO USE THIS INTELLIGENCE (NON-NEGOTIABLE) ===
1. The hook must attack a demand pattern or customer complaint named above, in the customer's own language — not a generic benefit line.
2. Competitor ad copy above shows the saturated angles in this niche. Deliberately position AGAINST them; if every competitor leads with price, lead with proof or speed.
3. Every "broll" background_prompt must describe ${ctx.businessName}'s real product/service from the site intelligence above — physical setting, materials, lighting, brand palette. Never generic stock imagery.
4. On-screen text should reuse high-intent search phrasing and proven hook mechanics above so the ad matches what this audience already responds to.
5. State the intelligence you leaned on in "why_it_works" — one sentence, concrete (e.g. "leads with the delivery-time complaint dominating reviews").`);

  return {
    section: blocks.filter(Boolean).join("\n\n"),
    sources,
    platform,
    evidence: {
      first_party: firstParty,
      ai_estimated: signals.length > 0,
      calibrated_patterns: calibrated,
    },
  };
}


function platformSpec(platform: string): string {
  const specs: Record<string, string> = {
    meta: `=== META (FACEBOOK / INSTAGRAM) AD PRODUCTION SPEC ===
- 4:5 or 9:16 framing, safe margins top and bottom for UI chrome.
- Hook must land inside 1.5 seconds; the first frame carries a face or a bold on-screen claim.
- Sound-off is the default: every beat needs readable on-screen text.
- Offer should appear twice — mid-roll and close — because Meta viewers rarely watch to the end.`,
    tiktok: `=== TIKTOK AD PRODUCTION SPEC ===
- 9:16 only. Native, hand-held energy beats polished studio gloss — but lighting and audio stay broadcast-grade.
- Hook in the first 1 second, spoken and on screen simultaneously.
- Fast cuts: no single scene longer than ~5 seconds. Text cards should feel kinetic, not static.
- Talk like a person, not a brand. The presenter is a peer giving a tip.`,
    youtube: `=== YOUTUBE ADS PRODUCTION SPEC ===
- 16:9 primary (9:16 for Shorts). Assume the viewer can skip at 5 seconds — the promise must be fully stated before then.
- Cinematic plates carry more weight here; allow longer holds and a proper close.`,
    linkedin: `=== LINKEDIN ADS PRODUCTION SPEC ===
- 1:1 or 4:5. Credibility over spectacle: numbers, outcomes, role-specific language.
- No hype, no urgency theatrics. Text cards should read like a data point, not a sale.`,
    google: `=== GOOGLE / DEMAND GEN VIDEO SPEC ===
- 16:9 and 9:16 deliverables. Intent-led: mirror the search phrasing in the first line and on the first text card.`,
  };
  return specs[platform] || specs.meta;
}
