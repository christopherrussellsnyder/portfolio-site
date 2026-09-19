// Standalone Research Analysis endpoint.
// Returns platform-level "what's working right now" intel — trending hooks,
// top-performing formats, high-signal content patterns, and niche benchmarks.
// Cached 24h in public.research_insights and shared across tenants (data is
// non-PII platform intelligence, not user data). Starter accounts see a
// depth-capped version; Pro/Agency see the full report.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";
import { similarity } from "../_shared/algorithms.ts";
import {
  crossSourceCorroboration,
  detectChangePoint,
  decayWeight,
  decayWeightedMean,
  detectEmergingTopics,
  linkClaimsToEvidence,
  resolveEntities,
  analyzeGaps,
  type ResearchClaim,
} from "../_shared/research-algorithms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const CACHE_TTL_HOURS = 24 * 7; // 7 days — trends move weekly, not hourly
const FORCE_REFRESH_COOLDOWN_HOURS = 12; // per platform+mode+industry, non-founder
const FOUNDER_EMAILS = new Set(["chrissnyder3456@gmail.com"]);

type ContentMode = "organic" | "paid" | "hybrid";

interface Body {
  platform: string;
  contentMode?: ContentMode;
  industry?: string;
  force?: boolean;
}

function normalizePlatform(p: string): string {
  const s = (p || "").toLowerCase().trim();
  if (s.includes("instagram")) return "instagram";
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("linkedin")) return "linkedin";
  if (s.includes("twitter") || s === "x") return "twitter";
  if (s.includes("facebook") || s.includes("meta")) return "facebook";
  if (s.includes("youtube")) return "youtube";
  return s || "instagram";
}

function buildPrompt(platform: string, mode: ContentMode, industry: string) {
  const modeLine =
    mode === "organic"
      ? "ORGANIC feed/profile content only (no paid ad spend)"
      : mode === "paid"
      ? "PAID ad creatives only (cold-audience direct-response)"
      : "HYBRID mix of organic feed content AND paid ad creatives";

  return `You are Korex Intelligence's research analyst. Produce a compact, high-signal AI-ESTIMATED research report on what is generally working on ${platform}.

IMPORTANT: You have NO live API access to ${platform} and no access to any user's account data. Everything you return is an ESTIMATE derived from your prior knowledge of publicly discussed patterns. Never present a figure as measured, live, or sourced from platform data. Engagement lift figures must be phrased as estimates (e.g. "est. +30-40% vs baseline").

Scope: ${modeLine}
Industry focus: ${industry || "general (all industries)"}

Requirements:
- Base everything on well-known, currently-effective patterns from the last 6-12 months on ${platform}.
- Concrete, not generic. "Split-screen POV with hard cut at 1.2s" beats "use engaging videos".
- Cite the mechanic behind why each pattern works (pattern interrupt, curiosity gap, loop, social proof, etc.).
- No filler. No disclaimers. No fabricated precision.

Return ONLY valid JSON (no markdown, no prose outside JSON):
{
  "platform": "${platform}",
  "content_mode": "${mode}",
  "industry": "${industry || "general"}",
  "generated_at": "${new Date().toISOString()}",
  "data_source_type": "ai_estimated",

  "trending_hooks": [
    { "hook": "string (exact opening line template)", "mechanic": "string", "example": "string", "best_for": "string" }
  ],
  "top_formats": [
    { "format": "string (e.g. 'Talking-head Reel with kinetic captions')", "why_it_works": "string", "typical_length_seconds": 0, "avg_engagement_lift": "string — must be phrased as an estimate, e.g. 'est. +30-40% vs baseline'" }
  ],
  "content_patterns": [
    { "pattern": "string", "description": "string", "when_to_use": "string" }
  ],
  "posting_cadence": { "posts_per_week": "string", "best_time_windows": ["string"], "notes": "string" },
  "hashtag_strategy": { "mix": "string (e.g. '2 broad + 5 mid + 3 niche')", "avoid": "string" },
  "cta_patterns": [ { "cta": "string", "context": "string" } ],
  "ad_campaign_intelligence": ${
    mode === "organic"
      ? "null"
      : `{ "recommended_optimization": "string (CBO / ABO / Advantage+ / Performance Max / manual)", "why": "string", "creative_ratios": "string", "budget_allocation": "string" }`
  },
  "emerging_trends": [ { "trend": "string", "signal_strength": "high|medium|low", "action": "string" } ],
  "pitfalls_to_avoid": [ "string" ]
}

Provide 4-5 trending_hooks, 3-4 top_formats, 3-4 content_patterns, 3 emerging_trends, 3 pitfalls_to_avoid, 3 cta_patterns. Keep every string tight — no fluff.`;
}

async function generateReport(
  platform: string,
  mode: ContentMode,
  industry: string,
): Promise<Record<string, unknown>> {
  if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");
  const prompt = buildPrompt(platform, mode, industry);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite", // cheapest capable model for structured JSON research
      messages: [
        { role: "system", content: "You return only valid JSON. No markdown fences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${body}`);
  }

  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Best-effort recovery: extract the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model returned invalid JSON");
  }
}

function starterCap(report: Record<string, unknown>): Record<string, unknown> {
  const cap = <T,>(arr: T[] | undefined, n: number) =>
    Array.isArray(arr) ? arr.slice(0, n) : arr;
  return {
    ...report,
    trending_hooks: cap(report.trending_hooks as unknown[], 3),
    top_formats: cap(report.top_formats as unknown[], 2),
    content_patterns: cap(report.content_patterns as unknown[], 2),
    emerging_trends: cap(report.emerging_trends as unknown[], 2),
    cta_patterns: cap(report.cta_patterns as unknown[], 2),
    pitfalls_to_avoid: cap(report.pitfalls_to_avoid as unknown[], 2),
    ad_campaign_intelligence: null,
    _starter_capped: true,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = await checkRateLimit(clientKey(req, "research-analysis"), {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = serviceClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const platform = normalizePlatform(body.platform);
    const mode: ContentMode = body.contentMode ?? "hybrid";
    const industry = (body.industry || "").trim().slice(0, 80);
    const force = !!body.force;

    // Tier check
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan_type")
      .eq("user_id", user.id)
      .maybeSingle();
    const isFounder = FOUNDER_EMAILS.has(user.email || "");
    const isPaid =
      isFounder ||
      (sub?.status === "active" && (sub.plan_type === "pro" || sub.plan_type === "agency"));

    // Cost guard: only the founder can bypass the cache on demand. For everyone
    // else a "force refresh" is honored only if the most recent cached report
    // is older than FORCE_REFRESH_COOLDOWN_HOURS. Otherwise we quietly serve
    // the cached copy — trend data doesn't change minute-to-minute and every
    // regenerate is a paid AI call.
    let allowForce = force && isFounder;
    let cached: Record<string, unknown> | null = null;

    const { data: latest } = await supabase
      .from("research_insights")
      .select("data, generated_at, expires_at")
      .eq("platform", platform)
      .eq("content_mode", mode)
      .eq("industry", industry || "general")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (force && !isFounder && latest?.generated_at) {
      const ageHours =
        (Date.now() - new Date(latest.generated_at).getTime()) / (3600 * 1000);
      allowForce = ageHours >= FORCE_REFRESH_COOLDOWN_HOURS;
    }

    if (!allowForce && latest?.expires_at && new Date(latest.expires_at).getTime() > Date.now()) {
      cached = latest.data as Record<string, unknown>;
    }

    let report = cached;
    let fromCache = !!cached;

    if (!report) {
      report = await generateReport(platform, mode, industry || "general");
      report.data_source_type = "ai_estimated";
      const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString();
      await supabase.from("research_insights").insert({
        platform,
        content_mode: mode,
        industry: industry || "general",
        data: report,
        data_source_type: "ai_estimated",
        expires_at: expiresAt,
      });
      fromCache = false;
    }

    // ===== First-party corroboration (per-user, deterministic, no AI cost) =====
    // The report itself is AI-estimated and shared/cached across users, so it
    // stays untouched. On top of it we check each estimated pattern against the
    // caller's OWN measured top-performing posts. Anything that matches gets
    // upgraded from "the model thinks" to "and your own numbers agree" — which
    // is the only claim here backed by real data. Runs after the cache read so
    // one user's history never leaks into another user's cached report.
    let corroboration: Record<string, unknown> = { checked: false };
    let intelligence: Record<string, unknown> = { computed: false };
    try {
      const { data: topPosts } = await supabase.rpc("get_top_performing_posts", {
        p_user_id: user.id,
        p_platform: platform,
        p_limit: 25,
      });
      const measured = (topPosts ?? []) as {
        content?: string;
        engagement_rate?: number;
        published_at?: string | null;
      }[];

      // ---- report claim extraction (AI-estimated side of the ledger) -------
      const reportClaims: string[] = [];
      const pushAll = (arr: unknown, pick: (x: any) => string) => {
        if (Array.isArray(arr)) {
          for (const x of arr) {
            const t = typeof x === "string" ? x : pick(x);
            if (t) reportClaims.push(String(t));
          }
        }
      };
      pushAll(report.trending_hooks, (x) => x?.hook ?? x?.text);
      pushAll(report.top_formats, (x) => [x?.format, x?.why_it_works].filter(Boolean).join(" — "));
      pushAll(report.content_patterns, (x) => [x?.pattern, x?.description].filter(Boolean).join(" — "));
      pushAll(report.emerging_trends, (x) => [x?.trend, x?.action].filter(Boolean).join(" — "));
      pushAll(report.cta_patterns, (x) => x?.cta);

      if (measured.length >= 3) {
        const corpus = measured.map((p) => String(p.content ?? "")).filter(Boolean);
        const hooks = Array.isArray(report.trending_hooks) ? report.trending_hooks : [];

        const confirmed: string[] = [];
        for (const h of hooks) {
          const text = typeof h === "string" ? h : String((h as any)?.hook ?? (h as any)?.text ?? "");
          if (!text) continue;
          const best = Math.max(0, ...corpus.map((c) => similarity(text, c)));
          if (best >= 0.28) confirmed.push(text);
        }

        corroboration = {
          checked: true,
          posts_compared: measured.length,
          confirmed_by_your_data: confirmed,
          note: confirmed.length
            ? `${confirmed.length} of these estimated patterns also appear in your own measured top-performing posts.`
            : "None of these estimated patterns appear in your measured top posts yet — treat them as untested hypotheses.",
        };
      } else {
        corroboration = {
          checked: false,
          note: "Not enough measured posts on your account yet to corroborate these estimates.",
        };
      }

      // ===================================================================
      // Deterministic research intelligence layer (no AI cost).
      // Nothing below invents data: every output is derived from the report
      // just generated, the account's measured posts, and previously stored
      // reports for this platform/mode/industry.
      // ===================================================================

      // Historical reports for this slice — the observation history that
      // change-point, decay and emerging-topic detection run over.
      const { data: history } = await supabase
        .from("research_insights")
        .select("data, generated_at")
        .eq("platform", platform)
        .eq("content_mode", mode)
        .eq("industry", industry || "general")
        .order("generated_at", { ascending: true })
        .limit(24);

      const historyRows = (history ?? []) as { data: any; generated_at: string }[];
      const textsOf = (d: any): string[] => {
        const out: string[] = [];
        const grab = (arr: any, pick: (x: any) => string) => {
          if (Array.isArray(arr)) for (const x of arr) {
            const t = typeof x === "string" ? x : pick(x);
            if (t) out.push(String(t));
          }
        };
        grab(d?.trending_hooks, (x) => x?.hook ?? x?.text);
        grab(d?.top_formats, (x) => x?.format);
        grab(d?.content_patterns, (x) => x?.pattern);
        grab(d?.emerging_trends, (x) => x?.trend);
        return out;
      };

      // 4 — emerging topic detection across report history windows
      const mid = Math.floor(historyRows.length / 2);
      const priorTexts = historyRows.slice(0, mid).flatMap((r) => textsOf(r.data));
      const recentTexts = historyRows.slice(mid).flatMap((r) => textsOf(r.data));
      const emerging =
        historyRows.length >= 2
          ? detectEmergingTopics(recentTexts.length ? recentTexts : reportClaims, priorTexts)
          : [];

      // 3 — decay model over the stored report history
      const decayed = historyRows.map((r) => ({
        generated_at: r.generated_at,
        ...decayWeight(r.generated_at, platform),
      }));
      const freshness = decayWeight(
        (latest?.generated_at as string) ?? new Date().toISOString(),
        platform,
      );

      // 2 — change-point detection over the account's measured engagement
      const series = measured
        .filter((p) => p.published_at && Number.isFinite(Number(p.engagement_rate)))
        .map((p) => ({ value: Number(p.engagement_rate), at: p.published_at as string }))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      const changePoint = detectChangePoint(series);
      const trendLevel = decayWeightedMean(series, platform);

      // 1 + 5 — cross-source corroboration and claim↔evidence linking
      const evidence: ResearchClaim[] = [
        ...reportClaims.map((t) => ({
          text: t,
          source: "korex_model_estimate",
          sourceType: "ai_estimated" as const,
          observedAt: new Date().toISOString(),
        })),
        ...historyRows.flatMap((r) =>
          textsOf(r.data).map((t) => ({
            text: t,
            source: `korex_report_${new Date(r.generated_at).toISOString().slice(0, 10)}`,
            sourceType: "ai_estimated" as const,
            observedAt: r.generated_at,
          })),
        ),
        ...measured.map((p) => ({
          text: String(p.content ?? ""),
          source: "your_published_posts",
          sourceType: "first_party" as const,
          observedAt: p.published_at ?? null,
          value: Number(p.engagement_rate) || null,
        })).filter((e) => e.text),
      ];

      const corroborated = crossSourceCorroboration(evidence).slice(0, 20);
      const linked = linkClaimsToEvidence(reportClaims.slice(0, 20), evidence);

      // 6 — entity / competitor resolution over any named entities present
      const entityMentions: { name: string; source?: string }[] = [];
      const compArr = (report as any)?.competitors ?? (report as any)?.notable_brands;
      if (Array.isArray(compArr)) {
        for (const c of compArr) {
          const name = typeof c === "string" ? c : String(c?.name ?? c?.brand ?? "");
          if (name) entityMentions.push({ name, source: "research_report" });
        }
      }
      for (const t of [...reportClaims, ...measured.map((m) => String(m.content ?? ""))]) {
        for (const m of t.matchAll(/@([A-Za-z0-9_.]{3,30})/g)) {
          entityMentions.push({ name: m[1], source: "mentions" });
        }
      }
      const entities = resolveEntities(entityMentions).slice(0, 15);

      // 7 — gap analysis: market coverage vs the account's own content
      const gaps = analyzeGaps(
        [...reportClaims, ...recentTexts],
        measured.map((p) => String(p.content ?? "")).filter(Boolean),
      );

      intelligence = {
        computed: true,
        method: "deterministic (no AI cost)",
        cross_source_corroboration: {
          claims: corroborated,
          note: "Agreement is weighted by distinct source, not by how often a claim is restated. AI-estimated sources are down-weighted against measured ones.",
        },
        change_point: {
          ...changePoint,
          decay_weighted_engagement_rate: trendLevel.value,
          effective_sample_size: trendLevel.effectiveSampleSize,
          basis: "your published posts with recorded impressions",
        },
        decay_model: {
          platform_half_life_days: freshness.halfLifeDays,
          current_report: freshness,
          history: decayed.slice(-8),
          note: "Older observations are exponentially down-weighted so stale patterns cannot outrank fresh ones.",
        },
        emerging_topics: {
          topics: emerging,
          windows_compared: historyRows.length,
          note: historyRows.length >= 2
            ? "Burst-scored against prior stored reports for this platform/mode/industry."
            : "Not enough stored report history yet to measure emergence — showing none rather than guessing.",
        },
        claim_evidence: {
          claims: linked,
          grading: "A = measured first-party support, B = corroborated across sources, C = single source, D = unsupported",
        },
        entities: {
          resolved: entities,
          note: entities.length
            ? "Surface forms of the same brand are collapsed before counting share of voice."
            : "No named entities were observed in this report or your content.",
        },
        gap_analysis: gaps,
      };
    } catch (e) {
      console.warn("research intelligence skipped:", (e as Error).message);
      intelligence = { computed: false, error: (e as Error).message };
    }


    const payload = {
      ...(isPaid ? report : starterCap(report)),
      data_source_type: "ai_estimated",
      data_source_note:
        "AI-estimated from model priors and publicly reported patterns. Not live platform data and not measured from your account.",
      first_party_corroboration: corroboration,
      research_intelligence: intelligence,
    };

    return new Response(
      JSON.stringify({
        report: payload,
        from_cache: fromCache,
        tier: isPaid ? "pro" : "starter",
        data_source_type: "ai_estimated",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("research-analysis error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
