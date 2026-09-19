import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number | null;
  change?: string | number | null;
  changePercent?: string | number | null;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function MetricCard({
  label,
  value,
  change,
  changePercent,
  icon,
  trend,
  className,
}: MetricCardProps) {
  if (value === null || value === undefined) return null;

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-muted-foreground';
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div className={cn('p-4 rounded-lg bg-muted/50 space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{formatValue(value)}</span>
        {(change !== null && change !== undefined) && (
          <div className={cn('flex items-center gap-1 text-sm', getTrendColor())}>
            {getTrendIcon()}
            <span>
              {typeof change === 'number' && change > 0 ? '+' : ''}
              {change}
              {changePercent !== null && changePercent !== undefined && (
                <span className="text-xs ml-1">({changePercent}%)</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
