import { useEffect, useState } from 'react';
import { Activity, Check, Loader2, Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OutcomeRow {
  id: string;
  strategy_post_id: string;
  predicted_engagement: number | null;
  actual_engagement: number | null;
  actual_reach: number | null;
  source: string;
  error_pct: number | null;
  strategy_posts?: { hook: string | null; post_date: string | null; strategy_id: string } | null;
}

/**
 * Closed-loop outcome capture. Shows posts whose scheduled date has passed
 * (~72h) so the user can report what actually happened. Rows already filled in
 * automatically from a connected Meta account are shown as measured.
 */
export function OutcomeTrackingPanel({ strategyId }: { strategyId?: string }) {
  const [rows, setRows] = useState<OutcomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { engagement: string; reach: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Ensure pending rows exist for posts that have aged out (safe to call repeatedly)
      await supabase.functions.invoke('capture-post-outcomes', { body: {} }).catch(() => null);

      let query = supabase
        .from('outcome_tracking')
        .select('id, strategy_post_id, predicted_engagement, actual_engagement, actual_reach, source, error_pct, strategy_posts(hook, post_date, strategy_id)')
        .order('created_at', { ascending: false })
        .limit(30);
      const { data, error } = await query;
      if (error) throw error;
      let list = (data ?? []) as unknown as OutcomeRow[];
      if (strategyId) list = list.filter((r) => r.strategy_posts?.strategy_id === strategyId);
      setRows(list);
    } catch (e) {
      console.error('Failed to load outcomes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId]);

  const save = async (row: OutcomeRow) => {
    const draft = drafts[row.id];
    const engagement = Number(draft?.engagement);
    if (!draft?.engagement || Number.isNaN(engagement) || engagement < 0) {
      toast({ title: 'Enter a valid engagement rate', description: 'Use a percentage, e.g. 3.4', variant: 'destructive' });
      return;
    }
    setSaving(row.id);
    try {
      const { error } = await supabase
        .from('outcome_tracking')
        .update({
          actual_engagement: engagement,
          actual_reach: draft.reach ? Number(draft.reach) : null,
          measured_at: new Date().toISOString(),
          source: 'manual_entry',
        })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: 'Outcome recorded', description: 'This feeds calibration for your niche.' });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, actual_engagement: engagement } : r)));
    } catch (e) {
      toast({ title: 'Could not save', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const pending = rows.filter((r) => r.actual_engagement == null);
  const measured = rows.filter((r) => r.actual_engagement != null);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking post outcomes…
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Outcome tracking
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reporting what actually happened calibrates future predictions for your niche.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{row.strategy_posts?.hook || 'Scheduled post'}</p>
                <p className="text-xs text-muted-foreground">
                  {row.strategy_posts?.post_date} · predicted {row.predicted_engagement ?? '—'}% engagement
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">How did this perform?</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="w-40"
                placeholder="Engagement %"
                inputMode="decimal"
                value={drafts[row.id]?.engagement ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...(d[row.id] ?? { engagement: '', reach: '' }), engagement: e.target.value } }))}
              />
              <Input
                className="w-40"
                placeholder="Reach (optional)"
                inputMode="numeric"
                value={drafts[row.id]?.reach ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: { ...(d[row.id] ?? { engagement: '', reach: '' }), reach: e.target.value } }))}
              />
              <Button size="sm" onClick={() => save(row)} disabled={saving === row.id}>
                {saving === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save outcome'}
              </Button>
            </div>
          </div>
        ))}

        {measured.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Measured</p>
            {measured.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{row.strategy_posts?.hook || 'Post'}</p>
                  <p className="text-xs text-muted-foreground">
                    predicted {row.predicted_engagement ?? '—'}% · actual {row.actual_engagement}%
                    {row.error_pct != null && ` · error ${row.error_pct > 0 ? '+' : ''}${row.error_pct}%`}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 gap-1">
                  {row.source === 'meta_api' ? <Plug className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {row.source === 'meta_api' ? 'Live API' : 'Manual'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
