import { createClient } from 'npm:@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { callLovableGateway } from '../_shared/llm-gateway.ts';
import { requireAgency } from '../_shared/require-pro.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Reports.tsx only renders the generate button for Agency (or founder)
    // accounts, per the "White-label reports" Agency perk on the pricing
    // page -- but that's a frontend-only gate. Enforce it here too, since
    // this does a real LLM call and was otherwise callable by any
    // authenticated user with a valid JWT.
    const gate = await requireAgency(req);
    if (gate instanceof Response) return gate;
    const userId = gate.userId;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { workspace_id, period_start, period_end, title, include_ai_narrative = true } = body ?? {};

    if (!workspace_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: 'workspace_id, period_start, period_end required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify membership
    const { data: member } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: 'Not a workspace member' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startISO = new Date(period_start).toISOString();
    const endISO = new Date(period_end).toISOString();

    // Aggregate posts
    const { data: posts } = await admin
      .from('scheduled_posts')
      .select('id, content, platforms, published_at, impressions, engagements, clicks, status')
      .eq('user_id', userId)
      .eq('status', 'published')
      .gte('published_at', startISO)
      .lte('published_at', endISO);

    const totalPosts = posts?.length ?? 0;
    const totalImpressions = posts?.reduce((s, p: any) => s + (p.impressions ?? 0), 0) ?? 0;
    const totalEngagements = posts?.reduce((s, p: any) => s + (p.engagements ?? 0), 0) ?? 0;
    const totalClicks = posts?.reduce((s, p: any) => s + (p.clicks ?? 0), 0) ?? 0;
    const engagementRate = totalImpressions > 0
      ? Math.round((totalEngagements / totalImpressions) * 10000) / 100
      : 0;

    const topPosts = (posts ?? [])
      .map((p: any) => ({
        ...p,
        rate: p.impressions > 0 ? (p.engagements / p.impressions) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.rate - a.rate)
      .slice(0, 5)
      .map((p: any) => ({
        content: (p.content ?? '').slice(0, 240),
        platforms: p.platforms,
        published_at: p.published_at,
        impressions: p.impressions,
        engagements: p.engagements,
        engagement_rate: Math.round(p.rate * 100) / 100,
      }));

    // Latest analytics + strategies
    const { data: analytics } = await admin
      .from('uploaded_analytics')
      .select('platform, extracted_data, ai_insights, uploaded_at')
      .eq('user_id', userId)
      .gte('uploaded_at', startISO)
      .order('uploaded_at', { ascending: false })
      .limit(3);

    const { data: strategies } = await admin
      .from('content_strategies')
      .select('id, title, duration_days, platforms, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .order('created_at', { ascending: false })
      .limit(3);

    const metrics = {
      total_posts: totalPosts,
      total_impressions: totalImpressions,
      total_engagements: totalEngagements,
      total_clicks: totalClicks,
      engagement_rate: engagementRate,
      top_posts: topPosts,
    };

    const strategy_snapshot = {
      strategies: strategies ?? [],
      analytics_summaries: (analytics ?? []).map((a: any) => ({
        platform: a.platform,
        summary: a.ai_insights?.summary ?? a.ai_insights?.overview ?? null,
        uploaded_at: a.uploaded_at,
      })),
    };

    // AI narrative
    let narrative = '';
    if (include_ai_narrative) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        try {
          const prompt = `Write a professional 4-paragraph performance report narrative for a marketing client covering ${period_start} to ${period_end}.

Numbers:
- Posts published: ${totalPosts}
- Impressions: ${totalImpressions.toLocaleString()}
- Engagements: ${totalEngagements.toLocaleString()}
- Engagement rate: ${engagementRate}%
- Clicks: ${totalClicks.toLocaleString()}

Top posts: ${topPosts.map((p: any) => `"${p.content.slice(0, 80)}" (${p.engagement_rate}%)`).join('; ') || 'none'}

Structure the response as JSON: { "executive_summary": "...", "what_worked": "...", "opportunities": "...", "next_steps": "..." }. Keep each section 2-3 sentences, confident and client-facing. No emojis.`;

          const resp = await callLovableGateway(lovableKey, {
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          });
          if (resp.ok) {
            const data = await resp.json();
            narrative = data?.choices?.[0]?.message?.content ?? '';
          }
        } catch (e) {
          console.error('AI narrative failed:', e);
        }
      }
    }

    let insights: any = {};
    try { insights = narrative ? JSON.parse(narrative) : {}; } catch { insights = { executive_summary: narrative }; }

    const reportTitle = title || `Performance Report — ${period_start} to ${period_end}`;

    const { data: inserted, error: insertErr } = await admin
      .from('client_reports')
      .insert({
        workspace_id,
        created_by: userId,
        title: reportTitle,
        period_start,
        period_end,
        metrics,
        insights,
        strategy_snapshot,
      })
      .select('id, share_token')
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, report: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('generate-client-report error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
