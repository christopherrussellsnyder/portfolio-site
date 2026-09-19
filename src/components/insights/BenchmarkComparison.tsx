import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Activity, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BenchmarkComparisonProps {
  benchmark: {
    engagement_rate_analysis?: {
      user_rate?: number | null;
      industry_benchmark?: number | null;
      performance_vs_benchmark?: string;
      percentile_rank?: string;
    };
    reach_rate_analysis?: {
      user_reach_rate?: number | null;
      typical_range?: string;
    };
    posting_frequency_analysis?: {
      detected_frequency?: string;
      recommended_frequency?: string;
      assessment?: string;
    };
    overall_performance_rating?: string;
    percentile_estimate?: string;
  };
}

export function BenchmarkComparison({ benchmark }: BenchmarkComparisonProps) {
  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Above Average':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Average':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Below Average':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Poor':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const calculateProgress = () => {
    const userRate = benchmark.engagement_rate_analysis?.user_rate;
    const benchmarkRate = benchmark.engagement_rate_analysis?.industry_benchmark;
    if (!userRate || !benchmarkRate) return 50;
    const ratio = (userRate / benchmarkRate) * 100;
    return Math.min(ratio, 200);
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      {benchmark.overall_performance_rating && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Overall Performance</p>
              <Badge className={cn('mt-1', getRatingColor(benchmark.overall_performance_rating))}>
                {benchmark.overall_performance_rating}
              </Badge>
            </div>
          </div>
          {benchmark.percentile_estimate && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Percentile</p>
              <p className="font-semibold">{benchmark.percentile_estimate}</p>
            </div>
          )}
        </div>
      )}

      {/* Engagement Rate Comparison */}
      {benchmark.engagement_rate_analysis && benchmark.engagement_rate_analysis.user_rate != null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Engagement Rate</h4>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Rate</span>
              <span className="font-medium">
                {benchmark.engagement_rate_analysis.user_rate}%
              </span>
            </div>
            <Progress 
              value={Math.min(calculateProgress(), 100)} 
              className="h-2"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Industry Benchmark</span>
              <span className="font-medium">
                {benchmark.engagement_rate_analysis.industry_benchmark}%
              </span>
            </div>
            {benchmark.engagement_rate_analysis.performance_vs_benchmark && (
              <p className="text-sm text-primary font-medium">
                {benchmark.engagement_rate_analysis.performance_vs_benchmark}
              </p>
            )}
            {benchmark.engagement_rate_analysis.percentile_rank && (
              <Badge variant="outline">
                {benchmark.engagement_rate_analysis.percentile_rank}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Reach Rate */}
      {benchmark.reach_rate_analysis && benchmark.reach_rate_analysis.user_reach_rate != null && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Reach Rate</h4>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold">
                  {benchmark.reach_rate_analysis.user_reach_rate}%
                </p>
                <p className="text-sm text-muted-foreground">of followers reached</p>
              </div>
              {benchmark.reach_rate_analysis.typical_range && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Typical Range</p>
                  <p className="font-medium">{benchmark.reach_rate_analysis.typical_range}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posting Frequency */}
      {benchmark.posting_frequency_analysis?.detected_frequency && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium">Posting Frequency</h4>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Your Frequency</p>
                <p className="font-medium">{benchmark.posting_frequency_analysis.detected_frequency}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommended</p>
                <p className="font-medium">{benchmark.posting_frequency_analysis.recommended_frequency}</p>
              </div>
            </div>
            {benchmark.posting_frequency_analysis.assessment && (
              <Badge 
                variant="outline" 
                className={cn(
                  'mt-3',
                  benchmark.posting_frequency_analysis.assessment === 'Optimal' 
                    ? 'text-green-400 border-green-400/30'
                    : benchmark.posting_frequency_analysis.assessment === 'Too Low'
                    ? 'text-amber-400 border-amber-400/30'
                    : 'text-muted-foreground'
                )}
              >
                {benchmark.posting_frequency_analysis.assessment}
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
