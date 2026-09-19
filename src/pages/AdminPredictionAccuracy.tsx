import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export default function AdminPredictionAccuracy() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const roleQuery = useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id);
      return (data ?? []).some((r) => r.role === 'owner' || r.role === 'admin');
    },
  });
  const allowed = roleQuery.data === true;

  const trendQuery = useQuery({
    queryKey: ['prediction-accuracy-daily'],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prediction_accuracy_daily')
        .select('*')
        .order('day', { ascending: true })
        .limit(90);
      if (error) throw error;
      return data ?? [];
    },
  });

  const calibrationQuery = useQuery({
    queryKey: ['niche-calibration'],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niche_calibration')
        .select('*')
        .order('sample_size', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const runNow = useMutation({
    mutationFn: async () => {
      await supabase.functions.invoke('capture-post-outcomes', { body: {} });
      const { data, error } = await supabase.functions.invoke('calculate-prediction-accuracy', { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast({ title: 'Loop run complete', description: `${d?.scored ?? 0} outcomes scored · ${d?.patterns ?? 0} patterns aggregated` });
      qc.invalidateQueries({ queryKey: ['prediction-accuracy-daily'] });
      qc.invalidateQueries({ queryKey: ['niche-calibration'] });
    },
    onError: (e: Error) => toast({ title: 'Run failed', description: e.message, variant: 'destructive' }),
  });

  if (authLoading || roleQuery.isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) return <Navigate to="/ai-strategist" replace />;

  const trend = (trendQuery.data ?? []) as any[];
  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const improving = latest && previous ? Number(latest.avg_abs_error_pct) < Number(previous.avg_abs_error_pct) : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <Helmet>
        <title>Prediction Accuracy | Korex Admin</title>
        <meta name="description" content="Internal dashboard tracking prediction accuracy over time." />
      </Helmet>

      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link to="/ai-strategist" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <Button size="sm" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
            {runNow.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run loop now
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-semibold">Prediction accuracy</h1>
          <p className="text-sm text-muted-foreground">Predicted vs actual engagement across all measured outcomes.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Latest avg abs error" value={latest ? `${latest.avg_abs_error_pct}%` : '—'} />
          <Stat label="Sample size" value={latest ? String(latest.sample_size) : '0'} />
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Trend</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
                {improving === null ? '—' : improving ? (
                  <><TrendingDown className="w-5 h-5 text-primary" /> improving</>
                ) : (
                  <><TrendingUp className="w-5 h-5 text-destructive" /> worsening</>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Average absolute error over time</CardTitle></CardHeader>
          <CardContent className="h-64">
            {trend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No snapshots yet — run the loop once outcomes are measured.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_abs_error_pct" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Niche calibration</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(calibrationQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No calibration rows yet.</p>
            ) : (
              (calibrationQuery.data as any[]).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{c.niche} · {c.pattern_type}: <span className="font-medium">{c.pattern_value}</span></p>
                    <p className="text-xs text-muted-foreground">
                      predicted {c.avg_predicted}% · actual {c.avg_actual}% · error {c.error_pct > 0 ? '+' : ''}{c.error_pct}% · n={c.sample_size}
                    </p>
                  </div>
                  <Badge variant={c.is_calibrated ? 'default' : 'outline'} className="shrink-0">
                    {c.is_calibrated ? 'Calibrated' : 'Collecting'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
