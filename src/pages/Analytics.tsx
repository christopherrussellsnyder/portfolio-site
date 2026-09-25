import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Minus, Eye, Heart,
  ThumbsUp, Share2, MessageCircle, MousePointerClick, AlertTriangle,
  CheckCircle2, Lightbulb, RefreshCw, Hash,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface Overview {
  totalPosts: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalClicks: number;
}

interface TrendPoint {
  change: number;
  direction: 'up' | 'down' | 'stable';
  label?: string;
}

interface ContentTypeRow {
  content_type: string;
  post_count: number;
  avg_engagement_rate: number;
}

interface TopPost {
  id: string;
  preview: string;
  platform: string;
  engagement: number;
  rate: number;
  date: string;
}

interface Insight {
  type: 'warning' | 'success' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  expectedImpact?: string;
}

interface AnalyticsResponse {
  overview: Overview;
  trends: { engagement: TrendPoint; impressions: TrendPoint; posts: TrendPoint };
  contentAnalysis: {
    bestPerformingType: string;
    bestEngagementRate: number;
    typeBreakdown: ContentTypeRow[];
    successfulKeywords: string[];
    successfulHashtags: string[];
  };
  topPosts: TopPost[];
  benchmarking: {
    engagementRate: { yours: number; industry: number; percentile: number; status: 'above' | 'below' };
    postFrequency: { yours: number; industry: number; status: 'good' | 'low' };
  };
  insights: Insight[];
  chartData: { timeline: { date: string; post_count: number; avg_engagement: number }[] };
}

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const insightConfig: Record<Insight['type'], { className: string; icon: typeof AlertTriangle }> = {
  warning: { className: 'border-destructive/40 bg-destructive/5', icon: AlertTriangle },
  success: { className: 'border-emerald-500/40 bg-emerald-500/5', icon: CheckCircle2 },
  opportunity: { className: 'border-primary/40 bg-primary/5', icon: Lightbulb },
};

function TrendBadge({ trend, label }: { trend: TrendPoint; label: string }) {
  const Icon = trend.direction === 'up' ? TrendingUp : trend.direction === 'down' ? TrendingDown : Minus;
  const color =
    trend.direction === 'up' ? 'text-emerald-500' : trend.direction === 'down' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={color}>{trend.change > 0 ? '+' : ''}{trend.change}%</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3 text-center">
        <Icon className="w-4 h-4 mx-auto mb-1 text-primary" />
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('all');
  const [rangeDays, setRangeDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { dateFrom, dateTo } = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(rangeDays));
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
  }, [rangeDays]);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke('analytics-intelligence', {
        body: { dateFrom, dateTo, platform },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      setData(resp);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load analytics';
      setErrorMsg(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, platform]);

  const timeline = useMemo(
    () => [...(data?.chartData.timeline || [])].sort((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  return (
    <>
      <Helmet>
        <title>Analytics | Korex Intelligence</title>
        <meta
          name="description"
          content="Native analytics dashboard built from your own tracked posts — trends, benchmarks, content-type performance, and prioritized insights."
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
                <BarChart3 className="w-4 h-4 text-primary" />
                <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
              </div>
              <DataSourceBadge type="first_party" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rangeDays} onValueChange={setRangeDays}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RANGE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={load} disabled={loading} aria-label="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-md" />)}
              </div>
              <Skeleton className="h-64 rounded-md" />
              <Skeleton className="h-40 rounded-md" />
            </div>
          ) : errorMsg ? (
            <Card className="bg-card border-destructive/30">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-destructive" />
                Couldn't load analytics: {errorMsg}
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={load}>Try again</Button>
                </div>
              </CardContent>
            </Card>
          ) : !data || data.overview.totalPosts === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-50" />
                No published posts with tracked engagement in this window yet. Publish and track posts
                to see performance here.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overview stat tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile icon={BarChart3} label="Posts" value={data.overview.totalPosts} />
                <StatTile icon={Eye} label="Impressions" value={data.overview.totalImpressions.toLocaleString()} />
                <StatTile icon={Heart} label="Avg. Engagement" value={`${data.overview.avgEngagementRate.toFixed(1)}%`} />
                <StatTile icon={ThumbsUp} label="Likes" value={data.overview.totalLikes.toLocaleString()} />
                <StatTile icon={Share2} label="Shares" value={data.overview.totalShares.toLocaleString()} />
                <StatTile icon={MessageCircle} label="Comments" value={data.overview.totalComments.toLocaleString()} />
                <StatTile icon={MousePointerClick} label="Clicks" value={data.overview.totalClicks.toLocaleString()} />
                <StatTile icon={TrendingUp} label="Total Engagement" value={data.overview.totalEngagement.toLocaleString()} />
              </div>

              {/* Trends */}
              <div className="flex flex-wrap gap-4 px-1">
                <TrendBadge trend={data.trends.engagement} label="engagement vs. prior half" />
                <TrendBadge trend={data.trends.impressions} label="impressions vs. prior half" />
                <TrendBadge trend={data.trends.posts} label="posting volume vs. prior half" />
              </div>

              {/* Timeline chart */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Engagement over time</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enough daily data points yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="avg_engagement" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Avg. engagement" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Benchmarking */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Vs. industry benchmark</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Engagement rate</span>
                        <Badge variant="outline" className={data.benchmarking.engagementRate.status === 'above' ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500'}>
                          {data.benchmarking.engagementRate.status === 'above' ? 'Above average' : 'Below average'}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        You: <strong>{data.benchmarking.engagementRate.yours.toFixed(1)}%</strong> · Industry:{' '}
                        {data.benchmarking.engagementRate.industry.toFixed(1)}% · {data.benchmarking.engagementRate.percentile}th percentile
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Posting frequency</span>
                        <Badge variant="outline" className={data.benchmarking.postFrequency.status === 'good' ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500'}>
                          {data.benchmarking.postFrequency.status === 'good' ? 'On pace' : 'Below pace'}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        You: <strong>{data.benchmarking.postFrequency.yours.toFixed(1)}/day</strong> · Industry:{' '}
                        {data.benchmarking.postFrequency.industry.toFixed(1)}/day
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Content type breakdown */}
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Content type performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.contentAnalysis.typeBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not enough variety in post types yet.</p>
                    ) : (
                      data.contentAnalysis.typeBreakdown.map((row, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-foreground">
                            {row.content_type}
                            {row.content_type === data.contentAnalysis.bestPerformingType && (
                              <Badge variant="outline" className="ml-2 text-[10px] border-primary/40 text-primary">Best</Badge>
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {row.post_count} posts · {row.avg_engagement_rate.toFixed(1)}% eng.
                          </span>
                        </div>
                      ))
                    )}
                    {(data.contentAnalysis.successfulHashtags.length > 0) && (
                      <div className="pt-2 border-t border-border/50 mt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Top hashtags in your best posts
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {data.contentAnalysis.successfulHashtags.map((h, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{h}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              {data.insights.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold">Insights</h2>
                  {data.insights.map((insight, i) => {
                    const cfg = insightConfig[insight.type];
                    const Icon = cfg.icon;
                    return (
                      <Card key={i} className={`border ${cfg.className}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-sm font-medium text-foreground">{insight.title}</p>
                                {insight.expectedImpact && (
                                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                                    {insight.expectedImpact}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                              {insight.actions?.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {insight.actions.map((action, j) => (
                                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <span className="text-primary">•</span> {action}
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

              {/* Top posts */}
              {data.topPosts.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top performing posts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.topPosts.map((post) => (
                      <div key={post.id} className="flex items-start justify-between gap-3 p-2.5 rounded-md bg-muted/30 border border-border/60">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground line-clamp-2">{post.preview}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 capitalize">
                            {post.platform} · {new Date(post.date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{post.rate?.toFixed(1)}% eng.</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
