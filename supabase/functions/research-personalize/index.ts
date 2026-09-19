// Hybrid layer for Research Analysis.
// Takes the shared niche-wide research report and layers a per-user
// "How this applies to YOUR business" section on top, grounded in the user's
// business_context (Settings > Business). Cached per (user, platform, mode,
// industry) for 7 days so we only pay the AI cost once per user per week.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";
const CACHE_TTL_HOURS = 24 * 7;
const FORCE_REFRESH_COOLDOWN_HOURS = 12;
const FOUNDER_EMAILS = new Set(["chrissnyder3456@gmail.com"]);

type ContentMode = "organic" | "paid" | "hybrid";

interface Body {
  platform: string;
  contentMode?: ContentMode;
  industry?: string;
  report: Record<string, unknown>;
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

// Extract only the trend fingerprint we need to feed the model — keeps the
// prompt small and cheap.
function trendFingerprint(report: Record<string, unknown>) {
  const pick = <T>(arr: unknown, n: number): T[] =>
    Array.isArray(arr) ? (arr.slice(0, n) as T[]) : [];
  return {
    trending_hooks: pick<Record<string, unknown>>(report.trending_hooks, 4).map(
      (h) => ({ hook: h.hook, mechanic: h.mechanic }),
    ),
    top_formats: pick<Record<string, unknown>>(report.top_formats, 3).map((f) => ({
      format: f.format,
      why: f.why_it_works,
    })),
    content_patterns: pick<Record<string, unknown>>(report.content_patterns, 3).map(
      (p) => ({ pattern: p.pattern, description: p.description }),
    ),
    ad_intel: report.ad_campaign_intelligence ?? null,
  };
}

async function fetchBusinessContext(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
) {
  // business_context is the richest signal (scraped + AI-analyzed website).
  const { data: bc } = await supabase
    .from("business_context")
    .select("business_profile, website_url")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  // Fall back to structured business_information from Settings.
  const { data: bi } = await supabase
    .from("business_information")
    .select(
      "business_name, industry, target_audience, unique_value_proposition, products_services, brand_voice, main_goals",
    )
    .eq("user_id", userId)
    .maybeSingle();

  return { business_context: bc ?? null, business_information: bi ?? null };
}

function buildPrompt(
  platform: string,
  mode: ContentMode,
  industry: string,
  trends: Record<string, unknown>,
  ctx: Record<string, unknown>,
) {
  return `You are Korex Intelligence's personalization layer. You have TWO inputs:

1) A ${platform} research report of what's working RIGHT NOW (${mode} content, ${industry} niche).
2) The user's specific business profile.

Your job: translate the generic trend intel into concrete, custom moves for THIS user's business. No generic advice — every recommendation must reference their actual product/audience/positioning.

TRENDS:
${JSON.stringify(trends, null, 2)}

BUSINESS PROFILE:
${JSON.stringify(ctx, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "positioning_summary": "1-2 sentence read of how this user is positioned vs the trends",
  "hook_adaptations": [
    { "trend_hook": "the generic hook", "your_version": "rewritten for this user's product/audience", "why": "why it fits" }
  ],
  "format_recommendations": [
    { "format": "specific format from trends", "custom_angle": "how THIS business should execute it", "example_concept": "a concrete post idea" }
  ],
  "content_pillars": [
    { "pillar": "string", "reason": "grounded in their audience/UVP", "example_topics": ["string", "string"] }
  ],
  "competitive_edge": "1-2 sentences on what unique angle they should own that competitors in this niche don't",
  "quick_wins": [ "3 specific, do-this-week actions tailored to their business" ]
}

Rules:
- 3 hook_adaptations, 3 format_recommendations, 3 content_pillars, exactly 3 quick_wins.
- Reference the user's product, audience, or UVP by name in every recommendation.
- Concrete over abstract. "Post a 15s split-screen showing a client's before/after of your Group Coaching Program" beats "share transformation content".
- If business profile is empty, say so in positioning_summary and give conservative recommendations.`;
}

async function generatePersonalization(
  platform: string,
  mode: ContentMode,
  industry: string,
  trends: Record<string, unknown>,
  ctx: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!LOVABLE_API_KEY) throw new Error("Missing LOVABLE_API_KEY");
  const prompt = buildPrompt(platform, mode, industry, trends, ctx);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "You return only valid JSON. No markdown fences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
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
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model returned invalid JSON");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rl = await checkRateLimit(clientKey(req, "research-personalize"), {
    limit: 20,
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
    const industry = (body.industry || "general").trim().slice(0, 80) || "general";
    const force = !!body.force;

    // Tier gate — hybrid layer is a Pro/Agency feature.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan_type")
      .eq("user_id", user.id)
      .maybeSingle();
    const isFounder = FOUNDER_EMAILS.has(user.email || "");
    const isPaid =
      isFounder ||
      (sub?.status === "active" && (sub.plan_type === "pro" || sub.plan_type === "agency"));

    if (!isPaid) {
      return new Response(
        JSON.stringify({
          error: "UPGRADE_REQUIRED",
          message: "Personalized research is a Pro/Agency feature.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check cache first.
    const { data: latest } = await supabase
      .from("research_personalizations")
      .select("data, generated_at, expires_at")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .eq("content_mode", mode)
      .eq("industry", industry)
      .maybeSingle();

    let allowForce = force && isFounder;
    if (force && !isFounder && latest?.generated_at) {
      const ageHours =
        (Date.now() - new Date(latest.generated_at).getTime()) / (3600 * 1000);
      allowForce = ageHours >= FORCE_REFRESH_COOLDOWN_HOURS;
    }

    if (
      !allowForce &&
      latest?.expires_at &&
      new Date(latest.expires_at).getTime() > Date.now()
    ) {
      return new Response(
        JSON.stringify({ personalization: latest.data, from_cache: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!body.report || typeof body.report !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing report payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ctx = await fetchBusinessContext(supabase, user.id);
    const trends = trendFingerprint(body.report);
    const personalization = await generatePersonalization(
      platform,
      mode,
      industry,
      trends,
      ctx,
    );

    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 3600 * 1000).toISOString();
    await supabase
      .from("research_personalizations")
      .upsert(
        {
          user_id: user.id,
          platform,
          content_mode: mode,
          industry,
          data: personalization,
          generated_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id,platform,content_mode,industry" },
      );

    return new Response(
      JSON.stringify({ personalization, from_cache: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("research-personalize error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
