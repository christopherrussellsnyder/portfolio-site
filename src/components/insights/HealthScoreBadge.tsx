import { cn } from '@/lib/utils';

interface HealthScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthScoreBadge({ score, size = 'md' }: HealthScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (score >= 6) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (score >= 4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Needs Work';
    return 'Critical';
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'rounded-full border-2 flex items-center justify-center font-bold',
          getScoreColor(score),
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      <span className={cn('text-xs font-medium', getScoreColor(score).split(' ')[1])}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}
