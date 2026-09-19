import { Lightbulb, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: {
    insight_number: number;
    insight: string;
    supporting_data?: string;
    importance: string;
    category: string;
    impact_potential?: string;
    reasoning?: string;
  };
}

export function InsightCard({ insight }: InsightCardProps) {
  const getCategoryIcon = () => {
    switch (insight.category) {
      case 'Strength':
        return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'Warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'Opportunity':
        return <Lightbulb className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getCategoryColor = () => {
    switch (insight.category) {
      case 'Strength':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Opportunity':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getImportanceColor = () => {
    switch (insight.importance) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400';
      case 'High':
        return 'bg-orange-500/20 text-orange-400';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', getCategoryColor().split(' ')[0])}>
            {getCategoryIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={getCategoryColor()}>
                {insight.category}
              </Badge>
              <Badge className={getImportanceColor()}>
                {insight.importance}
              </Badge>
              {insight.impact_potential && (
                <Badge variant="outline" className="text-xs">
                  {insight.impact_potential} Impact
                </Badge>
              )}
            </div>
            <p className="font-medium">{insight.insight}</p>
          </div>
        </div>
      </div>

      {insight.supporting_data && (
        <div className="pl-12">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Data: </span>
            {insight.supporting_data}
          </p>
        </div>
      )}

      {insight.reasoning && (
        <div className="pl-12">
          <p className="text-sm text-muted-foreground italic">
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
