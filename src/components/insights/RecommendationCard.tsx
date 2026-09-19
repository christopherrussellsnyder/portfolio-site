import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, Zap, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  recommendation: {
    recommendation_number: number;
    recommendation: string;
    rationale?: string;
    expected_impact: string;
    effort_required: string;
    timeframe: string;
    priority: string;
    implementation_steps?: string[];
    success_metrics?: string;
  };
  onComplete?: (id: number) => void;
  isCompleted?: boolean;
}

export function RecommendationCard({ 
  recommendation, 
  onComplete,
  isCompleted = false 
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'P0':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'P1':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'P2':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getImpactIcon = () => {
    switch (recommendation.expected_impact) {
      case 'High':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Medium':
        return <Target className="w-4 h-4 text-blue-400" />;
      default:
        return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn(
      'rounded-lg border bg-card overflow-hidden transition-all',
      isCompleted && 'opacity-60'
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox 
            checked={isCompleted}
            onCheckedChange={() => onComplete?.(recommendation.recommendation_number)}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getPriorityColor()}>
                {recommendation.priority}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getImpactIcon()}
                <span>{recommendation.expected_impact} Impact</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{recommendation.timeframe}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {recommendation.effort_required} Effort
              </Badge>
            </div>
            <p className={cn('font-medium', isCompleted && 'line-through')}>
              {recommendation.recommendation}
            </p>
          </div>
        </div>

        {recommendation.rationale && (
          <p className="text-sm text-muted-foreground mt-2 ml-7">
            {recommendation.rationale}
          </p>
        )}
      </div>

      {(recommendation.implementation_steps?.length || recommendation.success_metrics) && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full rounded-none border-t justify-between h-10">
              <span className="text-sm">
                {isExpanded ? 'Hide Details' : 'Show Implementation Steps'}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-2 space-y-3 border-t bg-muted/30">
              {recommendation.implementation_steps?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Implementation Steps</h4>
                  <ol className="space-y-1.5">
                    {recommendation.implementation_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {recommendation.success_metrics && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Success Metrics</h4>
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    {recommendation.success_metrics}
                  </p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
