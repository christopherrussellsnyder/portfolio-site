import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { requirePro } from "../_shared/require-pro.ts";
import { checkRateLimit, clientKey } from "../_shared/rate-limit.ts";
import { scoreCaption, selectDiverseCaptions } from "../_shared/algorithms.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Abuse guard runs BEFORE the auth/tier gate so unauthenticated floods are
  // rejected without any downstream work.
  const rl = await checkRateLimit(clientKey(req, "caption-variants"), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const gate = await requirePro(req);
  if (gate instanceof Response) return gate;

  try {
    const body = await req.json().catch(() => ({}));
    const { caption, hook, platform, postType, theme, contentCategory } = body ?? {};

    if (!caption || typeof caption !== 'string' || caption.length > 8000) {
      return new Response(
        JSON.stringify({ error: 'caption is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    // Over-generate, then keep the best two by objective score AND angle
    // distance. One call, same cost bracket — a wider candidate pool costs only
    // output tokens, and two near-identical variants make a worthless A/B test.
    const CANDIDATE_POOL = 5;

    const systemPrompt = `You are Korex Intelligence, an elite social media copywriter.
Generate ${CANDIDATE_POOL} genuinely distinct caption candidates for the same post idea. They will be scored and the two strongest, most different ones kept for an A/B test.

Rules:
- Keep the same core message, offer, and CTA intent as the original.
- Every candidate must use a DIFFERENT hook archetype AND a different structure
  (e.g. curiosity-gap, contrarian, story-led, direct/punchy, list-style).
- Two candidates that could be swapped without a reader noticing are a failure.
- Every candidate must contain one explicit, unmistakable call to action.
- Match the platform's native voice (${platform || 'social'}).
- Length should be similar to the original (±20%).
- Do NOT include hashtags in the variants.
- Output ONLY valid JSON, no markdown.

JSON schema:
{
  "variants": [
    { "angle": "<short angle description>", "hook": "<opening hook line>", "caption": "<full caption>" }
  ]
}`;

    const userPrompt = `ORIGINAL POST CONTEXT:
- Platform: ${platform || 'unspecified'}
- Post type: ${postType || 'unspecified'}
- Theme/Category: ${theme || contentCategory || 'unspecified'}
- Original hook: ${hook || '(none)'}
- Original caption:
"""
${caption}
"""

Generate ${CANDIDATE_POOL} distinct candidates now.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Usage limit reached. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { variants: [] };
    }

    // ===== Multi-objective selection (deterministic, zero AI cost) =====
    // Each candidate is scored on hook strength, CTA clarity, readability,
    // specificity and voice match against the original. Max-Marginal-Relevance
    // then picks two that are both strong AND far apart, so the A/B test
    // actually measures a difference.
    const pool: any[] = (Array.isArray(parsed?.variants) ? parsed.variants : [])
      .filter((v: any) => typeof v?.caption === 'string' && v.caption.trim().length > 20)
      .map((v: any) => ({ ...v, caption: String(v.caption).trim() }));

    const poolScores = pool.map((v: any) =>
      scoreCaption(v.caption, {
        platform: String(platform || ''),
        voiceReference: String(caption || ''),
        hook: String(v.hook || ''),
      }),
    );

    const { picked, rejected } = selectDiverseCaptions(pool, poolScores, 2);

    const variants = picked.map(({ item, score }, i) => ({
      label: `Variant ${i === 0 ? 'A' : 'B'}`,
      angle: item.angle ?? '',
      hook: item.hook ?? '',
      caption: item.caption,
      // Surfaced so the UI can explain WHY this variant was kept. This is a
      // pre-publication quality score, NOT a measured performance result.
      selection_score: score.total,
      selection_dimensions: {
        hook_strength: score.hookStrength,
        cta_clarity: score.ctaClarity,
        readability: score.readability,
        voice_match: score.voiceMatch,
        specificity: score.specificity,
      },
      selection_notes: score.notes,
    }));

    console.log(
      `Caption pool ${pool.length} → kept ${variants.length} ` +
      `(scores ${variants.map((v) => v.selection_score).join(', ')}; ` +
      `${rejected.length} rejected: ${rejected.map((r) => r.reason).join(' | ') || 'none'})`,
    );

    // Register the variants as a real experiment so caption choices are settled
    // by measured performance in the A/B framework, not by model judgment alone.
    let abTestId: string | null = null;
    let registered: { label: string; variant_id: string }[] = [];
    if (variants.length) {
      try {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } },
        );

        const { data: test, error: testErr } = await admin
          .from('ab_tests')
          .insert({
            user_id: gate.userId,
            name: `Caption test — ${String(hook || caption).slice(0, 40)}`,
            variable_being_tested: 'caption',
            hypothesis: 'A different hook or tone will lift engagement on the same offer.',
            platform: platform || null,
            status: 'running',
            start_date: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (testErr) throw testErr;
        abTestId = test.id;

        const rows = [
          { variant_name: 'Control (original)', content_template: caption, is_control: true },
          ...variants.map((v: any, i: number) => ({
            variant_name: String(v?.label || `Variant ${i === 0 ? 'A' : 'B'}`),
            content_template: String(v?.caption ?? ''),
            is_control: false,
            variable_value: { angle: v?.angle ?? null, hook: v?.hook ?? null },
          })),
        ].map((r) => ({ ...r, ab_test_id: abTestId }));

        const { data: inserted } = await admin
          .from('ab_test_variants')
          .insert(rows)
          .select('id, variant_name, is_control');

        registered = (inserted ?? [])
          .filter((r: any) => !r.is_control)
          .map((r: any) => ({ label: r.variant_name, variant_id: r.id }));
      } catch (e) {
        // The experiment is a bonus — never fail the generation over it.
        console.error('caption A/B registration failed (non-fatal):', e);
        abTestId = null;
      }
    }

    return new Response(
      JSON.stringify({ variants, ab_test_id: abTestId, registered_variants: registered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('generate-caption-variants error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
