import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  FlaskConical,
  Loader2,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  Trophy,
  Crown,
} from 'lucide-react';
import { DataSourceBadge } from '@/components/DataSourceBadge';
import { format } from 'date-fns';

interface ABVariant {
  id: string;
  variant_name: string;
  is_control: boolean | null;
  content_template: string | null;
  posts_published: number | null;
  avg_engagement_rate: number | null;
  total_engagement: number | null;
  total_impressions: number | null;
}

interface ABTest {
  id: string;
  name: string;
  description: string | null;
  hypothesis: string | null;
  variable_being_tested: string;
  status: string | null;
  minimum_sample_size: number | null;
  confidence_level: number | null;
  winner_variant_id: string | null;
  created_at: string | null;
  start_date: string | null;
  ab_test_variants: ABVariant[];
}

interface SignificanceResult {
  variant_id: string;
  variant_name: string;
  sample_size: number;
  avg_engagement_rate: number;
  is_statistically_significant: boolean;
  confidence_level: number;
  improvement_over_control: number;
}

interface TestAnalysis {
  status: string;
  totalSampleSize: number;
  meetsMinimum: boolean;
  hasWinner: boolean;
  recommendation: string;
  nextSteps: string[];
  insights: { type: string; message: string; confidence: number }[];
  estimatedTimeToCompletion: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'border-muted text-muted-foreground' },
  running: { label: 'Running', className: 'border-primary text-primary' },
  paused: { label: 'Paused', className: 'border-amber-500/50 text-amber-500' },
  completed: { label: 'Completed', className: 'border-emerald-500/50 text-emerald-500' },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status || 'draft'] ?? STATUS_CONFIG.draft;
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

export default function ABTesting() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<{ significance: SignificanceResult[]; analysis: TestAnalysis } | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ABTest | null>(null);

  const callAction = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('ab-testing', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadTests = async () => {
    setLoading(true);
    try {
      const data = await callAction({ action: 'get_tests' });
      const list: ABTest[] = data?.tests ?? [];
      setTests(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (e) {
      toast({
        title: 'Could not load experiments',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (testId: string) => {
    setResultsLoading(true);
    setResults(null);
    try {
      const data = await callAction({ action: 'get_results', testId });
      setResults({ significance: data?.significance ?? [], analysis: data?.analysis });
      // The test row returned here has fresher per-variant stats than the list view.
      if (data?.test) {
        setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...data.test } : t)));
      }
    } catch (e) {
      toast({
        title: 'Could not load results',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadResults(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const runAction = async (action: string, testId: string, successMessage: string) => {
    setActionPending(`${action}:${testId}`);
    try {
      await callAction({ action, testId });
      toast({ title: successMessage });
      await loadTests();
      if (testId === selectedId) await loadResults(testId);
    } catch (e) {
      toast({
        title: 'Action failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionPending(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const testId = deleteTarget.id;
    setDeleteTarget(null);
    setActionPending(`delete_test:${testId}`);
    try {
      await callAction({ action: 'delete_test', testId });
      toast({ title: 'Experiment deleted' });
      if (selectedId === testId) {
        setSelectedId(null);
        setResults(null);
      }
      await loadTests();
    } catch (e) {
      toast({
        title: 'Could not delete experiment',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionPending(null);
    }
  };

  const selectedTest = tests.find((t) => t.id === selectedId) ?? null;

  return (
    <>
      <Helmet>
        <title>A/B Testing | Korex Intelligence</title>
        <meta
          name="description"
          content="Experiments created automatically when you regenerate captions or generate video ad variants, with statistical significance and a recommended winner."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Button
            aria-label="Go back"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ai-strategist')}
            className="text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">A/B Testing</h1>
            <DataSourceBadge type="first_party" className="ml-1" />
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={loadTests} disabled={loading} className="border-border">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
            Experiments are created automatically when you regenerate captions or generate multiple video ad
            variants for the same post — two or more creative options get registered here and settled by
            measured performance, not by which one the model liked better.
          </p>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading experiments">
              <div className="lg:col-span-1 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <div className="lg:col-span-2 space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <FlaskConical className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No experiments yet</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Regenerate captions on a strategy post, or generate more than one video ad variant for the same
                day, and an experiment will show up here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Test list */}
              <div className="lg:col-span-1 space-y-3">
                {tests.map((t) => (
                  <Card
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedId === t.id ? 'border-primary ring-1 ring-primary/30' : ''
                    }`}
                    onClick={() => setSelectedId(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(t.id);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium leading-snug">{t.name}</p>
                        {t.winner_variant_id && <Crown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={t.status} />
                        <Badge variant="outline" className="border-border text-[10px] capitalize">
                          {t.variable_being_tested}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {t.ab_test_variants?.length ?? 0} variants
                        </span>
                      </div>
                      {t.created_at && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          {format(new Date(t.created_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selected test detail */}
              <div className="lg:col-span-2">
                {!selectedTest ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select an experiment to view results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{selectedTest.name}</CardTitle>
                            {selectedTest.hypothesis && (
                              <p className="text-xs text-muted-foreground mt-1">{selectedTest.hypothesis}</p>
                            )}
                          </div>
                          <StatusBadge status={selectedTest.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        {selectedTest.status === 'running' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending === `pause_test:${selectedTest.id}`}
                            onClick={() => runAction('pause_test', selectedTest.id, 'Experiment paused')}
                          >
                            {actionPending === `pause_test:${selectedTest.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Pause className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Pause
                          </Button>
                        )}
                        {(selectedTest.status === 'paused' || selectedTest.status === 'draft') && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending === `resume_test:${selectedTest.id}`}
                            onClick={() =>
                              runAction(
                                selectedTest.status === 'draft' ? 'start_test' : 'resume_test',
                                selectedTest.id,
                                selectedTest.status === 'draft' ? 'Experiment started' : 'Experiment resumed',
                              )
                            }
                          >
                            {actionPending === `resume_test:${selectedTest.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {selectedTest.status === 'draft' ? 'Start' : 'Resume'}
                          </Button>
                        )}
                        {selectedTest.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionPending === `check_for_winner:${selectedTest.id}`}
                            onClick={() => runAction('check_for_winner', selectedTest.id, 'Checked for a winner')}
                          >
                            {actionPending === `check_for_winner:${selectedTest.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Trophy className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Check for winner
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-auto text-destructive hover:text-destructive"
                          disabled={actionPending === `delete_test:${selectedTest.id}`}
                          onClick={() => setDeleteTarget(selectedTest)}
                        >
                          {actionPending === `delete_test:${selectedTest.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Delete
                        </Button>
                      </CardContent>
                    </Card>

                    {resultsLoading ? (
                      <Skeleton className="h-48 w-full" />
                    ) : (
                      <>
                        {results?.analysis && (
                          <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="p-4 space-y-2">
                              <p className="text-sm font-medium">{results.analysis.recommendation}</p>
                              <p className="text-xs text-muted-foreground">
                                {results.analysis.totalSampleSize} posts published so far
                                {!results.analysis.meetsMinimum &&
                                  ` • est. ${results.analysis.estimatedTimeToCompletion} to reach the minimum sample size`}
                              </p>
                              {results.analysis.nextSteps?.length > 0 && (
                                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 pt-1">
                                  {results.analysis.nextSteps.map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedTest.ab_test_variants?.map((v) => {
                            const sig = results?.significance?.find((s) => s.variant_id === v.id);
                            const isWinner = selectedTest.winner_variant_id === v.id;
                            return (
                              <Card
                                key={v.id}
                                className={isWinner ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : undefined}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-sm font-medium">{v.variant_name}</p>
                                    {v.is_control && (
                                      <Badge variant="outline" className="text-[10px] border-border">
                                        Control
                                      </Badge>
                                    )}
                                    {isWinner && (
                                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-500 border-emerald-500/40 gap-1">
                                        <Crown className="w-3 h-3" /> Winner
                                      </Badge>
                                    )}
                                  </div>
                                  {v.content_template && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                      {v.content_template}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs">
                                    <span>
                                      <span className="text-muted-foreground">Posts:</span>{' '}
                                      {v.posts_published ?? 0}
                                    </span>
                                    <span>
                                      <span className="text-muted-foreground">Avg eng:</span>{' '}
                                      {(v.avg_engagement_rate ?? 0).toFixed(2)}%
                                    </span>
                                  </div>
                                  {sig && (
                                    <p
                                      className={`text-xs mt-1.5 ${
                                        sig.improvement_over_control > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                                      }`}
                                    >
                                      {sig.improvement_over_control > 0 ? '+' : ''}
                                      {sig.improvement_over_control.toFixed(1)}% vs control
                                      {sig.is_statistically_significant && ' • statistically significant'}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this experiment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes "{deleteTarget?.name}" and all of its variants and results. This can't be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
