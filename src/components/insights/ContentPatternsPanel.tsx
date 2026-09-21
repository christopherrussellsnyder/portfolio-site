import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Hash, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface PatternInsight {
  type: string;
  title: string;
  description: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

interface PatternRecommendation {
  action: string;
  reason: string;
  target: string;
  expectedImpact: string;
}

interface PatternsResponse {
  insights: PatternInsight[];
  recommendations: PatternRecommendation[];
  topElements: { hashtags: { element: string; usage_count: number; avg_engagement: number }[] };
  summary: { totalPatterns: number; dataPoints: number; confidence: 'high' | 'medium' | 'low' };
}

const impactColors: Record<string, string> = {
  high: 'border-primary/50 text-primary bg-primary/10',
  medium: 'border-amber-500/40 text-amber-500 bg-amber-500/10',
  low: 'border-border text-muted-foreground bg-muted/30',
};

/** Self-fetching "what works for you" panel — mines the user's own published
 *  post history for content patterns. Independent of the screenshot-upload
 *  flow this page otherwise centers on, so it lives above it, always visible. */
export function ContentPatternsPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke('analyze-patterns', { body: { platform: 'all' } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        setData(data ?? null);
      })
      .catch((e) => {
        console.error('analyze-patterns failed (non-fatal):', e);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Fails soft — supplementary context, not the page's core feature.
  if (!data) return null;

  const hasContent = data.insights.length > 0 || data.recommendations.length > 0;

  return (
    <Card className="bg-card border-border mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              Your Content Patterns
            </CardTitle>
            <div className="flex items-center gap-2">
              <DataSourceBadge type="first_party" showLabel={false} />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            What actually works for you, mined from your own published posts
            {data.summary.dataPoints > 0 && ` — ${data.summary.dataPoints} posts analyzed`}.
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 text-sm">
            {!hasContent ? (
              <p className="text-xs text-muted-foreground py-2">
                Not enough published post history yet — patterns unlock once you have more posts
                with tracked engagement.
              </p>
            ) : (
              <>
                {data.insights.length > 0 && (
                  <div className="space-y-2">
                    {data.insights.slice(0, 4).map((insight, i) => (
                      <div key={i} className="flex gap-2 items-start p-3 rounded-md bg-muted/30 border border-border/60">
                        <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-foreground text-xs font-medium">{insight.title}</p>
                            <Badge variant="outline" className={`text-[10px] ${impactColors[insight.impact] || ''}`}>
                              {insight.impact} impact
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5">{insight.description}</p>
                          <p className="text-muted-foreground text-xs mt-0.5 italic">{insight.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {data.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      Recommendations
                    </p>
                    <ul className="space-y-1.5">
                      {data.recommendations.slice(0, 3).map((rec, i) => (
                        <li key={i} className="text-xs">
                          <span className="text-foreground font-medium">{rec.action}</span>
                          <span className="text-muted-foreground"> — {rec.reason}. {rec.target}.</span>
                          <Badge variant="outline" className="ml-1.5 text-[10px] border-primary/40 text-primary">
                            {rec.expectedImpact}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.topElements?.hashtags?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Top-performing hashtags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.topElements.hashtags.slice(0, 8).map((h, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {h.element} · {Number(h.avg_engagement).toFixed(1)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
