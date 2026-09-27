import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft, Workflow, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  AlertCircle, PlayCircle, FlaskConical, Zap,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface Rule {
  id: string;
  rule_name: string;
  rule_type: string;
  is_active: boolean;
  priority: number | null;
  trigger_count: number | null;
  success_count: number | null;
  last_triggered: string | null;
}

interface OptimizationAction {
  id: string;
  action_type: string;
  status: string | null;
  created_at: string | null;
  executed_at: string | null;
}

interface Stats {
  activeRules: number;
  totalTriggers: number;
  successRate: string;
  actionsLast24h: number;
  criticalAlerts: number;
  warningAlerts: number;
}

interface Insight {
  severity: 'critical' | 'warning' | 'success';
  title: string;
  description: string;
  actions: string[];
}

const severityConfig: Record<Insight['severity'], { className: string; icon: typeof AlertCircle }> = {
  critical: { className: 'border-destructive/40 bg-destructive/5', icon: AlertCircle },
  warning: { className: 'border-amber-500/40 bg-amber-500/5', icon: AlertTriangle },
  success: { className: 'border-emerald-500/40 bg-emerald-500/5', icon: CheckCircle2 },
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 text-center">
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function Automation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<Rule[]>([]);
  const [recentActions, setRecentActions] = useState<OptimizationAction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningPending, setRunningPending] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  const callAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('dynamic-optimization', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [dashboard, insightsResp] = await Promise.all([
        callAction({ action: 'get_dashboard' }),
        callAction({ action: 'get_performance_insights' }).catch(() => ({ insights: [] })),
      ]);
      setRules(dashboard?.rules || []);
      setRecentActions(dashboard?.recentActions || []);
      setStats(dashboard?.stats || null);
      setInsights(insightsResp?.insights || []);
    } catch (e) {
      console.error('Failed to load automation dashboard:', e);
      toast({ title: 'Could not load automation data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRule = async (rule: Rule) => {
    setTogglingId(rule.id);
    try {
      await callAction({ action: 'toggle_rule', ruleData: { ruleId: rule.id, isActive: !rule.is_active } });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not update rule', description: message, variant: 'destructive' });
    } finally {
      setTogglingId(null);
    }
  };

  const runPendingActions = async () => {
    setRunningPending(true);
    try {
      const data = await callAction({ action: 'execute_pending_actions' });
      toast({
        title: data.executed > 0 ? `Executed ${data.executed} action${data.executed === 1 ? '' : 's'}` : 'Nothing pending',
        description: data.executed > 0 ? undefined : 'No optimization rules had a pending trigger.',
      });
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not run pending optimizations', description: message, variant: 'destructive' });
    } finally {
      setRunningPending(false);
    }
  };

  const createAbTest = async () => {
    setCreatingTest(true);
    try {
      const data = await callAction({ action: 'auto_create_ab_test' });
      if (data.success === false) {
        toast({ title: data.error || 'No high-performing posts found yet' });
      } else {
        toast({ title: 'A/B test created', description: data.message || 'Built from your top-performing post.' });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Try again in a moment.';
      toast({ title: 'Could not create A/B test', description: message, variant: 'destructive' });
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Automation | Korex Intelligence</title>
        <meta
          name="description"
          content="Automation rules, recent optimization actions, and performance alerts across your account."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button aria-label="Go back" variant="ghost" size="icon" onClick={() => navigate('/ai-strategist')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">Automation</h1>
              </div>
              <DataSourceBadge type="first_party" />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={load} disabled={loading} aria-label="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Automation rules, recent actions, and performance alerts. Created automatically as you use A/B testing and auto-scheduling.
          </p>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Loading automation data">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-md" />)}
              </div>
              <Skeleton className="h-32 rounded-md" />
              <Skeleton className="h-32 rounded-md" />
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <StatTile label="Active rules" value={stats.activeRules} />
                  <StatTile label="Success rate" value={`${stats.successRate}%`} />
                  <StatTile label="Actions (24h)" value={stats.actionsLast24h} />
                  <StatTile label="Critical alerts" value={stats.criticalAlerts} />
                  <StatTile label="Warnings" value={stats.warningAlerts} />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={runPendingActions} disabled={runningPending} className="gap-1.5">
                  {runningPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  Run pending optimizations
                </Button>
                <Button variant="outline" size="sm" onClick={createAbTest} disabled={creatingTest} className="gap-1.5">
                  {creatingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                  Auto-create A/B test from top post
                </Button>
              </div>

              {insights.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold">Performance alerts</h2>
                  {insights.map((insight, i) => {
                    const cfg = severityConfig[insight.severity];
                    const Icon = cfg.icon;
                    return (
                      <Card key={i} className={`border ${cfg.className}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{insight.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                              {insight.actions?.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {insight.actions.map((a, j) => (
                                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-primary">•</span> {a}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Optimization rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No optimization rules yet. Rules are created automatically as automation features roll out.
                    </p>
                  ) : (
                    rules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-muted/30 border border-border/60">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{rule.rule_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {rule.rule_type} · triggered {rule.trigger_count || 0}x
                            {rule.trigger_count ? ` · ${Math.round(((rule.success_count || 0) / rule.trigger_count) * 100)}% success` : ''}
                          </p>
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule(rule)}
                          disabled={togglingId === rule.id}
                          aria-label={`Toggle ${rule.rule_name}`}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No optimization actions have run yet.</p>
                  ) : (
                    recentActions.slice(0, 10).map((action) => (
                      <div key={action.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground capitalize">{action.action_type.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{action.status || 'pending'}</Badge>
                          <span className="text-muted-foreground">
                            {action.created_at ? new Date(action.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </>
  );
}
