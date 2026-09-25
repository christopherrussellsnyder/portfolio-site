import { useEffect, useState } from 'react';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { DataSourceBadge } from '@/components/DataSourceBadge';

interface OptimalSlot {
  dayOfWeek: number;
  hour: number;
  engagementRate: number;
  confidence: string;
}

interface Suggestion {
  type: string;
  priority: string;
  reason: string;
  recommendation?: string;
  benefit?: string;
  expectedBoost?: string;
}

interface NextOptimalSlot {
  time: string;
  dayOfWeek: number;
  hour: number;
  expectedEngagement: number;
  reason: string;
}

interface PostingPattern {
  upcomingPosts: number;
  frequency: string;
  gaps: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
}

interface SchedulerData {
  hasHistoricalData: boolean;
  optimalSlots: OptimalSlot[];
  suggestions: Suggestion[];
  postingPattern: PostingPattern;
  nextOptimalSlot: NextOptimalSlot | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

/** Self-fetching "when should I post" widget — sits in the strategy sidebar
 *  alongside StrategyOverviewCard/CampaignStructureCard, scoped to whichever
 *  platform the strategy being viewed is on. */
export function SchedulerIntelligenceCard({ platform }: { platform?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SchedulerData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke('scheduler-intelligence', { body: { platform: platform || 'all' } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        setData(data ?? null);
      })
      .catch((e) => {
        console.error('scheduler-intelligence failed (non-fatal):', e);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Fails soft — this is bonus context, not core strategy data, so a failed
  // fetch just hides the card rather than showing an error in the sidebar.
  if (!data || (!data.nextOptimalSlot && !data.optimalSlots?.length)) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Best Times to Post
          </CardTitle>
          <DataSourceBadge type={data.hasHistoricalData ? 'first_party' : 'ai_estimated'} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {data.nextOptimalSlot && (
          <div className="flex gap-2 items-start p-3 rounded-md bg-primary/5 border border-primary/20">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-foreground text-xs font-medium">
                Next best window: {DAYS[data.nextOptimalSlot.dayOfWeek]} {formatHour(data.nextOptimalSlot.hour)}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">{data.nextOptimalSlot.reason}</p>
            </div>
          </div>
        )}

        {data.optimalSlots?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Your best windows
            </p>
            <ul className="space-y-1">
              {data.optimalSlots.slice(0, 5).map((slot, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">
                    {DAYS[slot.dayOfWeek]} {formatHour(slot.hour)}
                  </span>
                  <span className="text-muted-foreground">{slot.engagementRate.toFixed(1)}% eng.</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.postingPattern && (
          <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
            {data.postingPattern.upcomingPosts} post{data.postingPattern.upcomingPosts === 1 ? '' : 's'} scheduled
            in the next 30 days
            {data.postingPattern.recommendation !== 'maintain' &&
              ` — consider ${data.postingPattern.recommendation === 'increase' ? 'posting more often' : 'posting less often'}`}
          </p>
        )}

        {data.suggestions?.slice(0, 2).map((s, i) => (
          <div key={i} className="flex gap-2 items-start">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground text-xs leading-relaxed">{s.reason}</p>
              {(s.recommendation || s.benefit) && (
                <p className="text-muted-foreground text-xs leading-relaxed">{s.recommendation || s.benefit}</p>
              )}
              {s.expectedBoost && (
                <Badge variant="outline" className="mt-1 text-[10px] border-primary/40 text-primary">
                  {s.expectedBoost}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
