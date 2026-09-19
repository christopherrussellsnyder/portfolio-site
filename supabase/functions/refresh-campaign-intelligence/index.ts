import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { serviceClient } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORMS = ["meta", "tiktok", "google", "linkedin"];
const PRIORITY_NICHES = [
  "general", "ecommerce", "saas", "fitness", "beauty", "fashion",
  "finance", "real estate", "education", "food and beverage",
  "health and wellness", "agency", "coaching", "b2b services",
];

async function callAI(apiKey: string, prompt: string): Promise<any> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a senior paid-media analyst producing AI-ESTIMATED directional guidance from prior knowledge. You have NO live access to Meta, Google, TikTok or LinkedIn APIs. Never state a specific ROAS, CPA, CTR or revenue figure as if it were measured — describe direction and relative comparison only, and say what the estimate is based on. Return ONLY valid JSON, no markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

function buildPrompt(platform: string, niche: string): string {
  return `Produce an AI-ESTIMATED (not live, not measured) view of the paid-media landscape on ${platform.toUpperCase()} for businesses in the "${niche}" niche.

This is an estimate derived from your prior knowledge of publicly reported benchmarks and platform documentation. It is NOT connected to any ad account or platform API. Do not invent precise metrics; give direction, relative comparison, and the reasoning behind it.

Return JSON:

{
  "recommended_structure": "CBO | ABO | Advantage+ | Performance Max | Smart+ | Manual",
  "confidence_score": 1-10,
  "rationale": "2-3 sentences explaining why this structure is generally believed to outperform alternatives in this niche",
  "roas_trend": "DIRECTIONAL estimate only — e.g. 'Advantage+ Shopping generally reported to outperform manual ABO in DTC ecom'. No fabricated numbers.",
  "profit_margin_trend": "directional statement about likely net-margin impact, no fabricated numbers",
  "budget_split": {"prospecting": 70, "retargeting": 30},
  "audience_approach": "specific targeting recommendation",
  "creative_volume": "specific creative cadence recommendation",
  "alternative_to_test": "secondary structure worth A/B testing",
  "estimate_basis": "1 sentence naming what this estimate is grounded in (published benchmarks, platform docs, common practice)"
}

Be specific to ${platform} and ${niche}. No generic platitudes. No fake precision.`;
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = serviceClient();

    // Optional: pass { platform, niche } to refresh a single pair on demand
    let targets: { platform: string; niche: string }[] = [];
    try {
      const body = await req.json();
      if (body?.platform && body?.niche) {
        targets = [{ platform: body.platform, niche: body.niche }];
      }
    } catch { /* no body */ }

    if (targets.length === 0) {
      for (const p of PLATFORMS) for (const n of PRIORITY_NICHES) targets.push({ platform: p, niche: n });
    }

    console.log(`Refreshing ${targets.length} signals`);
    let updated = 0;
    let failed = 0;

    for (const { platform, niche } of targets) {
      try {
        const result = await callAI(LOVABLE_API_KEY, buildPrompt(platform, niche));
        const { error } = await supabase
          .from("campaign_intelligence_signals")
          .upsert({
            platform,
            niche,
            recommended_structure: result.recommended_structure,
            confidence_score: result.confidence_score,
            rationale: result.rationale,
            roas_trend: result.roas_trend,
            profit_margin_trend: result.profit_margin_trend,
            budget_split: result.budget_split || {},
            audience_approach: result.audience_approach,
            creative_volume: result.creative_volume,
            alternative_to_test: result.alternative_to_test,
            data_source_type: "ai_estimated",
            refreshed_at: new Date().toISOString(),
          }, { onConflict: "platform,niche" });

        if (error) { console.error(`upsert ${platform}/${niche}`, error); failed++; }
        else updated++;

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 400));
      } catch (e: any) {
        console.error(`AI failed for ${platform}/${niche}:`, e.message);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, updated, failed, total: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("refresh error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
