import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Sparkles,
  TrendingUp,
  Zap,
  Target,
  Clock,
  Hash,
  MousePointerClick,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Lock,
  ArrowLeft,
  User,
  Rocket,
  Layers,
} from 'lucide-react';
import { DataSourceBadge, type DataSourceType } from '@/components/DataSourceBadge';

interface Personalization {
  positioning_summary?: string;
  hook_adaptations?: { trend_hook: string; your_version: string; why: string }[];
  format_recommendations?: { format: string; custom_angle: string; example_concept: string }[];
  content_pillars?: { pillar: string; reason: string; example_topics: string[] }[];
  competitive_edge?: string;
  quick_wins?: string[];
}

type ContentMode = 'organic' | 'paid' | 'hybrid';

interface ResearchReport {
  platform: string;
  content_mode: ContentMode;
  industry?: string;
  generated_at?: string;
  trending_hooks?: { hook: string; mechanic: string; example: string; best_for: string }[];
  top_formats?: {
    format: string;
    why_it_works: string;
    typical_length_seconds: number;
    avg_engagement_lift: string;
  }[];
  content_patterns?: { pattern: string; description: string; when_to_use: string }[];
  posting_cadence?: { posts_per_week: string; best_time_windows: string[]; notes: string };
  hashtag_strategy?: { mix: string; avoid: string };
  cta_patterns?: { cta: string; context: string }[];
  ad_campaign_intelligence?: {
    recommended_optimization: string;
    why: string;
    creative_ratios: string;
    budget_allocation: string;
  } | null;
  emerging_trends?: { trend: string; signal_strength: string; action: string }[];
  pitfalls_to_avoid?: string[];
  data_source_type?: DataSourceType;
  data_source_note?: string;
  _starter_capped?: boolean;
}

const PLATFORMS: { value: string; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
];

const MODES: { value: ContentMode; label: string }[] = [
  { value: 'organic', label: 'Organic content' },
  { value: 'paid', label: 'Paid ads' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function Research() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('instagram');
  const [mode, setMode] = useState<ContentMode>('hybrid');
  const [industry, setIndustry] = useState('');
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [tier, setTier] = useState<'starter' | 'pro'>('starter');
  const [personalization, setPersonalization] = useState<Personalization | null>(null);
  const [personalizing, setPersonalizing] = useState(false);
  const [personalizationCached, setPersonalizationCached] = useState(false);

  const loadPersonalization = async (r: ResearchReport, force = false) => {
    setPersonalizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-personalize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            platform,
            contentMode: mode,
            industry,
            report: r,
            force,
          }),
        },
      );
      if (!resp.ok) {
        // Silent — the shared report is still shown. 403 = starter tier.
        setPersonalization(null);
        return;
      }
      const j = await resp.json();
      setPersonalization(j.personalization ?? null);
      setPersonalizationCached(!!j.from_cache);
    } catch {
      setPersonalization(null);
    } finally {
      setPersonalizing(false);
    }
  };

  const load = async (force = false) => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ platform, contentMode: mode, industry, force }),
        },
      );

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        const raw = (j.error || `HTTP ${resp.status}`).toString();
        const lower = raw.toLowerCase();
        let title = 'Research is taking a breather';
        let description = 'Something went sideways on our end — give it another try in a moment.';
        if (resp.status === 402 || lower.includes('credit')) {
          title = 'AI credits are running low';
          description =
            'Korex has temporarily paused fresh research to keep costs sane. Cached reports still work — full research resumes once credits refresh.';
        } else if (resp.status === 429 || lower.includes('rate')) {
          title = 'Slow down just a sec';
          description = 'Too many research requests in a short window. Try again in about a minute.';
        } else if (resp.status === 401) {
          title = 'Session expired';
          description = 'Please sign back in to keep exploring research.';
        }
        toast({ title, description, variant: 'destructive' });
        return;
      }
      const j = await resp.json();
      setReport(j.report);
      setFromCache(!!j.from_cache);
      setTier(j.tier || 'starter');
      setPersonalization(null);
      if (j.tier === 'pro' && j.report) {
        // Fire and forget — personalization is additive, not blocking.
        loadPersonalization(j.report, force);
      }
    } catch (e) {
      toast({
        title: 'Research is taking a breather',
        description:
          e instanceof Error && e.message
            ? e.message
            : 'Network hiccup — please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCapped = !!report?._starter_capped;

  return (
    <>
      <Helmet>
        <title>Research Analysis | Korex Intelligence</title>
        <meta
          name="description"
          content="AI-estimated research on what tends to work across every major social platform — trending hooks, top formats, content patterns, and paid campaign guidance. Estimates, not live platform data."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <Button aria-label="Go back"
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ai-strategist')}
            className="text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight">Research Analysis</h1>
            <DataSourceBadge type="ai_estimated" className="ml-1" />
          </div>
          {tier === 'starter' && (
            <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
              <Lock className="w-3 h-3 mr-1" /> Starter — limited depth
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {fromCache && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Cached • refreshes weekly
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => load(true)}
              disabled={loading}
              className="border-border"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {/* Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="bg-background border-card mb-6">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Strategy type</label>
                <Select value={mode} onValueChange={(v) => setMode(v as ContentMode)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Industry (optional)</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. fitness coaching"
                  className="w-full h-10 px-3 bg-background border border-border rounded-md text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => load(false)} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isCapped && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              You're seeing a <span className="font-semibold text-primary">preview</span> of Korex Research
              Analysis. Upgrade to Pro or Agency to unlock the full report (all hooks, formats, patterns, and
              paid campaign intelligence).
              <Button
                size="sm"
                className="ml-3"
                onClick={() => navigate('/settings')}
              >
                Upgrade
              </Button>
            </div>
          )}

          {loading && !report && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              Generating the {platform} estimate…
            </div>
          )}

          {report && (
            <div className="space-y-5">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                <DataSourceBadge type="ai_estimated" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {report.data_source_note ??
                    'Everything in this report is an AI estimate generated from model priors and publicly reported patterns. It is not live platform data and is not measured from your account.'}{' '}
                  Your own measured results — shown as{' '}
                  <span className="text-primary font-medium">Your Data</span> in Insights and
                  Strategies — always take priority over these estimates.
                </p>
              </div>
              {tier === 'pro' && (
                <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      How this applies to your business
                    </h2>
                    <DataSourceBadge type="ai_estimated" />
                    {personalizationCached && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Cached • refreshes weekly
                      </span>
                    )}
                  </div>

                  {personalizing && !personalization && (
                    <div className="flex items-center text-sm text-muted-foreground py-6">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Tailoring these trends to your business profile…
                    </div>
                  )}

                  {!personalizing && !personalization && (
                    <p className="text-xs text-muted-foreground">
                      Add your business info in{' '}
                      <button
                        onClick={() => navigate('/settings')}
                        className="text-primary underline underline-offset-2"
                      >
                        Settings
                      </button>{' '}
                      to unlock a version of this report written specifically for your product,
                      audience, and positioning.
                    </p>
                  )}

                  {personalization && (
                    <div className="space-y-4">
                      {personalization.positioning_summary && (
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {personalization.positioning_summary}
                        </p>
                      )}

                      {personalization.hook_adaptations &&
                        personalization.hook_adaptations.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-primary mb-2">
                              Your custom hooks
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {personalization.hook_adaptations.map((h, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-card bg-background p-3"
                                >
                                  <p className="text-xs text-muted-foreground italic mb-1">
                                    Trend: "{h.trend_hook}"
                                  </p>
                                  <p className="text-sm font-medium mb-1">"{h.your_version}"</p>
                                  <p className="text-xs text-muted-foreground">{h.why}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {personalization.format_recommendations &&
                        personalization.format_recommendations.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-primary mb-2">
                              Format plays for you
                            </p>
                            <div className="space-y-2">
                              {personalization.format_recommendations.map((f, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-card bg-background p-3"
                                >
                                  <p className="text-sm font-medium mb-1">{f.format}</p>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {f.custom_angle}
                                  </p>
                                  <p className="text-xs text-primary">
                                    Try: {f.example_concept}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {personalization.content_pillars &&
                        personalization.content_pillars.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-primary mb-2">
                              <Layers className="w-3 h-3 inline mr-1" />
                              Content pillars to own
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {personalization.content_pillars.map((p, i) => (
                                <div
                                  key={i}
                                  className="rounded-lg border border-card bg-background p-3"
                                >
                                  <p className="text-sm font-medium mb-1">{p.pillar}</p>
                                  <p className="text-xs text-muted-foreground mb-2">{p.reason}</p>
                                  {p.example_topics && (
                                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                      {p.example_topics.map((t, j) => (
                                        <li key={j}>{t}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {personalization.competitive_edge && (
                        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                          <p className="text-xs uppercase tracking-wider text-primary mb-1">
                            Your edge
                          </p>
                          <p className="text-sm">{personalization.competitive_edge}</p>
                        </div>
                      )}

                      {personalization.quick_wins &&
                        personalization.quick_wins.length > 0 && (
                          <div>
                            <p className="text-xs uppercase tracking-wider text-primary mb-2">
                              <Rocket className="w-3 h-3 inline mr-1" />
                              Do this week
                            </p>
                            <ul className="space-y-1.5">
                              {personalization.quick_wins.map((q, i) => (
                                <li
                                  key={i}
                                  className="text-sm rounded-lg border border-card bg-background p-3 flex gap-2"
                                >
                                  <span className="text-primary font-semibold">{i + 1}.</span>
                                  <span>{q}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              <Section source="ai_estimated" title="Trending Hooks" icon={<TrendingUp className="w-4 h-4" />}>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.trending_hooks?.map((h, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-card bg-background p-4"
                    >
                      <p className="text-sm font-medium text-foreground mb-2">"{h.hook}"</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="text-primary">Mechanic:</span> {h.mechanic}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="text-primary">Example:</span> {h.example}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-primary">Best for:</span> {h.best_for}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>

              <Section source="ai_estimated" title="Top-Performing Formats" icon={<Zap className="w-4 h-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.top_formats?.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-card bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-foreground">{f.format}</p>
                        <Badge variant="outline" className="border-primary/40 text-primary shrink-0">
                          {f.avg_engagement_lift}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{f.why_it_works}</p>
                      {f.typical_length_seconds ? (
                        <p className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {f.typical_length_seconds}s typical length
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Section>

              <Section source="ai_estimated" title="Content Patterns" icon={<Target className="w-4 h-4" />}>
                <div className="space-y-2">
                  {report.content_patterns?.map((p, i) => (
                    <div key={i} className="rounded-lg border border-card bg-background p-4">
                      <p className="text-sm font-medium text-foreground mb-1">{p.pattern}</p>
                      <p className="text-xs text-muted-foreground mb-1">{p.description}</p>
                      <p className="text-xs text-primary">When to use: {p.when_to_use}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {report.posting_cadence && (
                <Section source="ai_estimated" title="Posting Cadence" icon={<Clock className="w-4 h-4" />}>
                  <div className="rounded-lg border border-card bg-background p-4 text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">Frequency:</span>{' '}
                      {report.posting_cadence.posts_per_week}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Best windows:</span>{' '}
                      {report.posting_cadence.best_time_windows?.join(' • ')}
                    </p>
                    <p className="text-xs text-muted-foreground">{report.posting_cadence.notes}</p>
                  </div>
                </Section>
              )}

              {report.hashtag_strategy && (
                <Section source="ai_estimated" title="Hashtag Strategy" icon={<Hash className="w-4 h-4" />}>
                  <div className="rounded-lg border border-card bg-background p-4 text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">Mix:</span>{' '}
                      {report.hashtag_strategy.mix}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avoid: {report.hashtag_strategy.avoid}
                    </p>
                  </div>
                </Section>
              )}

              {report.cta_patterns && report.cta_patterns.length > 0 && (
                <Section source="ai_estimated" title="CTA Patterns" icon={<MousePointerClick className="w-4 h-4" />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {report.cta_patterns.map((c, i) => (
                      <div key={i} className="rounded-lg border border-card bg-background p-3">
                        <p className="text-sm font-medium">"{c.cta}"</p>
                        <p className="text-xs text-muted-foreground">{c.context}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {report.ad_campaign_intelligence && (
                <Section source="ai_estimated" title="Ad Campaign Intelligence (AI-Estimated)" icon={<Target className="w-4 h-4" />}>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">Recommended:</span>{' '}
                      <span className="font-semibold text-primary">
                        {report.ad_campaign_intelligence.recommended_optimization}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.ad_campaign_intelligence.why}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary">Creative ratios:</span>{' '}
                      {report.ad_campaign_intelligence.creative_ratios}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary">Budget allocation:</span>{' '}
                      {report.ad_campaign_intelligence.budget_allocation}
                    </p>
                  </div>
                </Section>
              )}

              {report.emerging_trends && report.emerging_trends.length > 0 && (
                <Section source="ai_estimated" title="Emerging Trends" icon={<TrendingUp className="w-4 h-4" />}>
                  <div className="space-y-2">
                    {report.emerging_trends.map((t, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-card bg-background p-3 flex items-start gap-3"
                      >
                        <Badge
                          variant="outline"
                          className={
                            t.signal_strength === 'high'
                              ? 'border-primary text-primary'
                              : 'border-muted text-muted-foreground'
                          }
                        >
                          {t.signal_strength}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{t.trend}</p>
                          <p className="text-xs text-muted-foreground">{t.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {report.pitfalls_to_avoid && report.pitfalls_to_avoid.length > 0 && (
                <Section source="ai_estimated" title="Pitfalls to Avoid" icon={<AlertTriangle className="w-4 h-4" />}>
                  <ul className="space-y-1.5 text-sm">
                    {report.pitfalls_to_avoid.map((p, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-card bg-background p-3 text-muted-foreground"
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  icon,
  source,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  source?: DataSourceType;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-transparent border-transparent">
      <CardHeader className="p-0 mb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
          {source && <DataSourceBadge type={source} className="ml-1 text-[10px]" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
