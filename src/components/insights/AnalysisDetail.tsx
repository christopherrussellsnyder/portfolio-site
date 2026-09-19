import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Lightbulb, Target, TrendingUp, AlertTriangle, 
  Sparkles, Eye, Heart, MessageCircle, Share2, Bookmark, Users,
  ArrowUpRight, ArrowDownRight, ExternalLink, Download,
  DollarSign, Image, FileText, Table, FileSpreadsheet, Code, FileCode, File
} from 'lucide-react';
import { HealthScoreBadge } from './HealthScoreBadge';
import { MetricCard } from './MetricCard';
import { InsightCard } from './InsightCard';
import { RecommendationCard } from './RecommendationCard';
import { TrendsList } from './TrendsList';
import { BenchmarkComparison } from './BenchmarkComparison';

function getFormatBadge(format: string | null | undefined) {
  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    image: { label: 'Screenshot', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Image className="w-3 h-3" /> },
    pdf: { label: 'PDF', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <FileText className="w-3 h-3" /> },
    excel: { label: 'Excel', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <Table className="w-3 h-3" /> },
    csv: { label: 'CSV', className: 'bg-teal-500/20 text-teal-400 border-teal-500/30', icon: <FileSpreadsheet className="w-3 h-3" /> },
    json: { label: 'JSON', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Code className="w-3 h-3" /> },
    xml: { label: 'XML', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <FileCode className="w-3 h-3" /> },
  };
  const cfg = configs[format || ''] || null;
  if (!cfg) return null;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
      {cfg.icon}
      Analyzed from {cfg.label}
    </Badge>
  );
}

interface AnalysisDetailProps {
  upload: {
    id: string;
    platform: string;
    platform_confidence?: string | null;
    extracted_data: any;
    trend_analysis?: any;
    benchmark_comparison?: any;
    pattern_recognition?: any;
    insights?: any;
    recommendations?: any;
    opportunities?: any;
    risks?: any;
    follow_up_questions?: string[] | null;
    summary?: any;
    overall_health_score?: number | null;
    performance_rating?: string | null;
    time_period_start?: string | null;
    time_period_end?: string | null;
    image_url?: string;
    file_format?: string | null;
    platform_type?: string | null;
    ad_platform_specific?: any;
    original_filename?: string | null;
  };
}

export function AnalysisDetail({ upload }: AnalysisDetailProps) {
  const navigate = useNavigate();
  const [completedRecs, setCompletedRecs] = useState<number[]>([]);

  const toggleRecComplete = (id: number) => {
    setCompletedRecs(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      facebook: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      twitter: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      tiktok: 'bg-slate-500/20 text-slate-200 border-slate-500/30',
      linkedin: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
      youtube: 'bg-red-500/20 text-red-300 border-red-500/30',
      google: 'bg-green-500/20 text-green-300 border-green-500/30',
      shopify: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      pinterest: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    const key = platform?.toLowerCase() || '';
    const match = Object.keys(colors).find((k) => key.includes(k));
    return match ? colors[match] : 'bg-muted text-foreground border-border';
  };


  const metrics = upload.extracted_data || {};
  
  return (
    <div className="space-y-6">
      {/* Quick Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Health Score */}
            <div className="flex-shrink-0">
              <HealthScoreBadge 
                score={upload.overall_health_score || 5} 
                size="lg" 
              />
            </div>

            {/* Summary Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getPlatformColor(upload.platform)}>
                  {upload.platform || 'Unknown Platform'}
                </Badge>
                {upload.platform_type === 'advertising' && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                    <DollarSign className="w-3 h-3 mr-0.5" />
                    Advertising
                  </Badge>
                )}
                {upload.platform_confidence && (
                  <Badge variant="outline" className="text-xs">
                    {upload.platform_confidence} Confidence
                  </Badge>
                )}
                {upload.performance_rating && (
                  <Badge variant="secondary">
                    {upload.performance_rating}
                  </Badge>
                )}
                {upload.time_period_start && upload.time_period_end && (
                  <Badge variant="outline" className="text-xs">
                    {upload.time_period_start} - {upload.time_period_end}
                  </Badge>
                )}
                {getFormatBadge(upload.file_format)}
              </div>

              {upload.summary?.one_sentence_summary && (
                <p className="text-lg">{upload.summary.one_sentence_summary}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                {upload.summary?.top_3_strengths?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-400 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      Top Strengths
                    </h4>
                    <ul className="space-y-1">
                      {upload.summary.top_3_strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-green-400">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {upload.summary?.top_3_areas_for_improvement?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-1">
                      {upload.summary.top_3_areas_for_improvement.map((s: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-amber-400">!</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {upload.summary?.immediate_action_required && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-400">Immediate Action Required</p>
                    <p className="text-sm text-muted-foreground">{upload.summary.immediate_action_reason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="metrics" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 hidden sm:block" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 mr-1 hidden sm:block" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="text-xs sm:text-sm">
            <Target className="w-4 h-4 mr-1 hidden sm:block" />
            Benchmark
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs sm:text-sm">
            <Lightbulb className="w-4 h-4 mr-1 hidden sm:block" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="actions" className="text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 mr-1 hidden sm:block" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 mr-1 hidden sm:block" />
            Risks
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Extracted Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                  label="Followers" 
                  value={metrics.account_metrics?.followers} 
                  change={metrics.account_metrics?.followers_change}
                  changePercent={metrics.account_metrics?.followers_change_percent}
                  trend={metrics.account_metrics?.followers_change > 0 ? 'up' : metrics.account_metrics?.followers_change < 0 ? 'down' : 'stable'}
                  icon={<Users className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Engagement Rate" 
                  value={metrics.engagement_metrics?.engagement_rate ? `${metrics.engagement_metrics.engagement_rate}%` : null}
                  change={metrics.engagement_metrics?.engagement_rate_change}
                  trend={metrics.engagement_metrics?.engagement_rate_change > 0 ? 'up' : metrics.engagement_metrics?.engagement_rate_change < 0 ? 'down' : 'stable'}
                  icon={<Heart className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Reach" 
                  value={metrics.reach_metrics?.reach}
                  change={metrics.reach_metrics?.reach_change}
                  changePercent={metrics.reach_metrics?.reach_change_percent}
                  trend={metrics.reach_metrics?.reach_change > 0 ? 'up' : metrics.reach_metrics?.reach_change < 0 ? 'down' : 'stable'}
                  icon={<Eye className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Impressions" 
                  value={metrics.reach_metrics?.impressions}
                  change={metrics.reach_metrics?.impressions_change}
                  changePercent={metrics.reach_metrics?.impressions_change_percent}
                  trend={metrics.reach_metrics?.impressions_change > 0 ? 'up' : metrics.reach_metrics?.impressions_change < 0 ? 'down' : 'stable'}
                  icon={<Eye className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Total Likes" 
                  value={metrics.engagement_metrics?.total_likes}
                  icon={<Heart className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Comments" 
                  value={metrics.engagement_metrics?.total_comments}
                  icon={<MessageCircle className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Shares" 
                  value={metrics.engagement_metrics?.total_shares}
                  icon={<Share2 className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Saves" 
                  value={metrics.engagement_metrics?.total_saves}
                  icon={<Bookmark className="w-4 h-4" />}
                />
                <MetricCard 
                  label="Profile Visits" 
                  value={metrics.traffic_metrics?.profile_visits}
                  change={metrics.traffic_metrics?.profile_visits_change}
                />
                <MetricCard 
                  label="Link Clicks" 
                  value={metrics.traffic_metrics?.link_clicks}
                  change={metrics.traffic_metrics?.link_clicks_change}
                />
                <MetricCard 
                  label="Video Views" 
                  value={metrics.video_metrics?.total_views}
                />
                <MetricCard 
                  label="Avg Watch Time" 
                  value={metrics.video_metrics?.avg_watch_time}
                />
              </div>

              {/* Ad Platform Metrics */}
              {upload.platform_type === 'advertising' && metrics.ad_metrics && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Advertising Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Spend" value={metrics.ad_metrics.spend != null ? `$${metrics.ad_metrics.spend}` : null} change={metrics.ad_metrics.spend_change} icon={<DollarSign className="w-4 h-4" />} />
                    <MetricCard label="ROAS" value={metrics.ad_metrics.roas != null ? `${metrics.ad_metrics.roas}x` : null} icon={<TrendingUp className="w-4 h-4" />} />
                    <MetricCard label="CPC" value={metrics.ad_metrics.cpc != null ? `$${metrics.ad_metrics.cpc}` : null} icon={<DollarSign className="w-4 h-4" />} />
                    <MetricCard label="CPM" value={metrics.ad_metrics.cpm != null ? `$${metrics.ad_metrics.cpm}` : null} icon={<DollarSign className="w-4 h-4" />} />
                    <MetricCard label="CTR" value={metrics.ad_metrics.ctr != null ? `${metrics.ad_metrics.ctr}%` : null} icon={<Target className="w-4 h-4" />} />
                    <MetricCard label="Conversions" value={metrics.ad_metrics.conversions} icon={<Target className="w-4 h-4" />} />
                    <MetricCard label="Cost/Conversion" value={metrics.ad_metrics.cost_per_conversion != null ? `$${metrics.ad_metrics.cost_per_conversion}` : null} icon={<DollarSign className="w-4 h-4" />} />
                    <MetricCard label="Quality Score" value={metrics.ad_metrics.quality_score} icon={<Sparkles className="w-4 h-4" />} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upload.trend_analysis ? (
                <TrendsList 
                  positiveTrends={upload.trend_analysis.positive_trends || []}
                  negativeTrends={upload.trend_analysis.negative_trends || []}
                  stableMetrics={upload.trend_analysis.stable_metrics || []}
                  momentum={upload.trend_analysis.growth_momentum}
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No trend data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benchmark Tab */}
        <TabsContent value="benchmark">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Industry Benchmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upload.benchmark_comparison ? (
                <BenchmarkComparison benchmark={upload.benchmark_comparison} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No benchmark data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Strategic Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upload.insights?.length > 0 ? (
                upload.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No insights available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Recommended Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upload.recommendations?.length > 0 ? (
                upload.recommendations.map((rec, i) => (
                  <RecommendationCard 
                    key={i} 
                    recommendation={rec} 
                    isCompleted={completedRecs.includes(rec.recommendation_number)}
                    onComplete={toggleRecComplete}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recommendations available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Opportunities */}
          {upload.opportunities?.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <ArrowUpRight className="w-5 h-5" />
                  Growth Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upload.opportunities.map((opp: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start justify-between">
                        <p className="font-medium">{opp.opportunity}</p>
                        <Badge variant="outline" className="text-blue-400 border-blue-400/30">
                          {opp.potential_impact} Impact
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Difficulty: {opp.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upload.risks?.length > 0 ? (
                <div className="space-y-3">
                  {upload.risks.map((risk: any, i: number) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-lg border ${
                        risk.severity === 'Critical' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : risk.severity === 'High'
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium">{risk.risk}</p>
                        <Badge className={
                          risk.severity === 'Critical' 
                            ? 'bg-red-500/20 text-red-400' 
                            : risk.severity === 'High'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }>
                          {risk.severity}
                        </Badge>
                      </div>
                      {risk.mitigation && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <span className="font-medium">Mitigation:</span> {risk.mitigation}
                        </p>
                      )}
                      {risk.urgency && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {risk.urgency}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No risks identified
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Follow-up Questions */}
      {upload.follow_up_questions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Explore Further</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {upload.follow_up_questions.map((q, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/ai-strategist', { state: { prefillMessage: q } })}
                  className="text-left h-auto py-2"
                >
                  {q}
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Screenshot Preview & Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          className="flex-1"
          onClick={() => navigate('/ai-strategist')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Strategy Based on This Data
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Original Source */}
      {upload.image_url && upload.file_format !== 'csv' && upload.file_format !== 'excel' && upload.file_format !== 'json' && upload.file_format !== 'xml' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {upload.file_format === 'pdf' ? 'Original PDF' : 'Original Screenshot'}
              {upload.original_filename && (
                <span className="text-sm font-normal text-muted-foreground ml-2">{upload.original_filename}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={upload.image_url} 
              alt="Analytics source" 
              className="w-full rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Non-image file info */}
      {upload.original_filename && (upload.file_format === 'csv' || upload.file_format === 'excel' || upload.file_format === 'json' || upload.file_format === 'xml') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="w-5 h-5" />
              Source File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {getFormatBadge(upload.file_format)}
              <span className="text-sm text-muted-foreground">{upload.original_filename}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
