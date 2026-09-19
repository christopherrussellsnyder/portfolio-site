import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MIN_SAMPLE = 10;

// Nightly: compute prediction error per outcome, aggregate calibration per niche+pattern,
// and snapshot the platform-wide accuracy trend.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  // Nightly cron, or an admin/owner triggering a manual run from the internal dashboard.
  const authHeader = req.headers.get('Authorization') ?? '';
  const isCron = req.headers.get('Lovable-Context') === 'cron' || authHeader === `Bearer ${serviceKey}`;
  if (!isCron) {
    const { data: userData } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    const uid = userData?.user?.id;
    let isAdmin = false;
    if (uid) {
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', uid);
      isAdmin = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'owner');
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }


  try {
    const { data: rows, error } = await supabase
      .from('outcome_tracking')
      .select(
        'id, niche, predicted_engagement, actual_engagement, pattern_hook_technique, pattern_post_type, creative_treatment, creative_shot_opening, creative_text_density, creative_duration_bucket, creative_captions, error_pct, measured_at',
      )
      .not('actual_engagement', 'is', null)
      .not('predicted_engagement', 'is', null)
      .limit(5000);

    if (error) throw error;

    const outcomes = (rows ?? []) as any[];
    if (!outcomes.length) return json({ ok: true, scored: 0, patterns: 0, message: 'no measured outcomes yet' });

    // 1. per-row error
    let scored = 0;
    for (const r of outcomes) {
      const predicted = Number(r.predicted_engagement);
      const actual = Number(r.actual_engagement);
      if (!predicted) continue;
      const err = round2(((actual - predicted) / predicted) * 100);
      r.__error = err;
      if (r.error_pct === null || Math.abs(Number(r.error_pct) - err) > 0.01) {
        await supabase.from('outcome_tracking').update({ error_pct: err }).eq('id', r.id);
        scored++;
      }
    }

    // 2. aggregate by niche + pattern
    type Agg = { predicted: number; actual: number; n: number };
    const buckets = new Map<string, Agg>();
    const add = (niche: string, type: string, value: string | null, r: any) => {
      if (!value) return;
      const key = `${niche}||${type}||${value}`;
      const b = buckets.get(key) ?? { predicted: 0, actual: 0, n: 0 };
      b.predicted += Number(r.predicted_engagement) || 0;
      b.actual += Number(r.actual_engagement) || 0;
      b.n += 1;
      buckets.set(key, b);
    };
    for (const r of outcomes) {
      const niche = r.niche || 'general';
      add(niche, 'hook_technique', r.pattern_hook_technique, r);
      add(niche, 'post_type', r.pattern_post_type, r);
      // Creative choices ride the identical loop — same minimum sample size,
      // same error maths, so an edit decision is trusted on the same terms.
      add(niche, 'creative_treatment', r.creative_treatment, r);
      add(niche, 'creative_shot_opening', r.creative_shot_opening, r);
      add(niche, 'creative_text_density', r.creative_text_density, r);
      add(niche, 'creative_duration_bucket', r.creative_duration_bucket, r);
      add(
        niche,
        'creative_captions',
        typeof r.creative_captions === 'boolean' ? (r.creative_captions ? 'captions_on' : 'captions_off') : null,
        r,
      );
    }


    const calibrationRows = [...buckets.entries()].map(([key, b]) => {
      const [niche, pattern_type, pattern_value] = key.split('||');
      const avgPredicted = round2(b.predicted / b.n);
      const avgActual = round2(b.actual / b.n);
      return {
        niche,
        pattern_type,
        pattern_value,
        avg_predicted: avgPredicted,
        avg_actual: avgActual,
        error_pct: avgPredicted ? round2(((avgActual - avgPredicted) / avgPredicted) * 100) : 0,
        sample_size: b.n,
        is_calibrated: b.n >= MIN_SAMPLE,
        last_updated: new Date().toISOString(),
      };
    });

    if (calibrationRows.length) {
      const { error: calErr } = await supabase
        .from('niche_calibration')
        .upsert(calibrationRows, { onConflict: 'niche,pattern_type,pattern_value' });
      if (calErr) throw calErr;
    }

    // 3. daily accuracy snapshot
    const day = new Date().toISOString().slice(0, 10);
    const withErr = outcomes.filter((r) => typeof r.__error === 'number');
    if (withErr.length) {
      const avgAbs = round2(withErr.reduce((a, r) => a + Math.abs(r.__error), 0) / withErr.length);
      await supabase.from('prediction_accuracy_daily').upsert({
        day,
        sample_size: withErr.length,
        avg_abs_error_pct: avgAbs,
        avg_predicted: round2(withErr.reduce((a, r) => a + Number(r.predicted_engagement), 0) / withErr.length),
        avg_actual: round2(withErr.reduce((a, r) => a + Number(r.actual_engagement), 0) / withErr.length),
      }, { onConflict: 'day' });
    }

    console.log(`calculate-prediction-accuracy: scored=${scored} patterns=${calibrationRows.length}`);
    return json({ ok: true, scored, patterns: calibrationRows.length, calibrated: calibrationRows.filter((c) => c.is_calibrated).length });
  } catch (e) {
    console.error('calculate-prediction-accuracy error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
