import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Trend {
  metric: string;
  current_value?: number | null;
  change?: string;
  velocity?: string;
  significance?: string;
}

interface TrendsListProps {
  positiveTrends: Trend[];
  negativeTrends: Trend[];
  stableMetrics?: string[];
  momentum?: string;
}

export function TrendsList({ 
  positiveTrends, 
  negativeTrends, 
  stableMetrics = [],
  momentum 
}: TrendsListProps) {
  const getVelocityColor = (velocity?: string) => {
    switch (velocity) {
      case 'Rapid':
        return 'bg-green-500/20 text-green-400';
      case 'Strong':
        return 'bg-blue-500/20 text-blue-400';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getMomentumIcon = () => {
    switch (momentum) {
      case 'Accelerating':
        return '🚀';
      case 'Steady':
        return '➡️';
      case 'Slowing':
        return '⚠️';
      case 'Declining':
        return '📉';
      default:
        return '📊';
    }
  };

  return (
    <div className="space-y-6">
      {momentum && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <span className="text-xl">{getMomentumIcon()}</span>
          <div>
            <span className="text-sm text-muted-foreground">Growth Momentum:</span>
            <span className="ml-2 font-medium">{momentum}</span>
          </div>
        </div>
      )}

      {positiveTrends.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2 text-green-400">
            <TrendingUp className="w-4 h-4" />
            Positive Trends
          </h4>
          <div className="space-y-2">
            {positiveTrends.map((trend, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="font-medium">{trend.metric}</span>
                </div>
                <div className="flex items-center gap-2">
                  {trend.change && (
                    <span className="text-sm text-green-400">{trend.change}</span>
                  )}
                  {trend.velocity && (
                    <Badge className={getVelocityColor(trend.velocity)}>
                      {trend.velocity}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {negativeTrends.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2 text-red-400">
            <TrendingDown className="w-4 h-4" />
            Areas Needing Attention
          </h4>
          <div className="space-y-2">
            {negativeTrends.map((trend, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="font-medium">{trend.metric}</span>
                </div>
                <div className="flex items-center gap-2">
                  {trend.change && (
                    <span className="text-sm text-red-400">{trend.change}</span>
                  )}
                  {trend.significance && (
                    <Badge variant="outline" className="text-red-400 border-red-400/30">
                      {trend.significance} Priority
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stableMetrics.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Minus className="w-4 h-4" />
            Stable Metrics
          </h4>
          <div className="flex flex-wrap gap-2">
            {stableMetrics.map((metric, i) => (
              <Badge key={i} variant="outline" className="text-muted-foreground">
                {metric}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
