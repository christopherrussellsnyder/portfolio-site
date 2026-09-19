import { Brain, Sparkles, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

interface Props {
  progress: number;
  currentStep: string;
}

export function WizardLoadingState({ progress, currentStep }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (progress >= 100) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  return (
    <div className="py-12 space-y-8">
      {/* Animated Brain */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-purple-500 opacity-20 animate-ping absolute" />
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center relative">
            {progress >= 100 ? (
              <Check className="w-12 h-12 text-white" />
            ) : (
              <Brain className="w-12 h-12 text-white animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold flex items-center justify-center gap-2">
          {progress >= 100 ? (
            <>
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Strategy Generated Successfully!
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </>
          ) : (
            'Generating Your 14-Day Strategy'
          )}
        </h3>
        <p className="text-muted-foreground">
          {progress >= 100 
            ? 'Redirecting to your strategy...'
            : currentStep
          }
        </p>
      </div>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-3" />
        {progress < 100 && (
          <p className="text-xs text-muted-foreground text-center">
            This may take 60-90 seconds...
          </p>
        )}
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce text-6xl">🎉</div>
        </div>
      )}
    </div>
  );
}
