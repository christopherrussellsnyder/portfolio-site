import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

export function GettingStartedCard({ className }: { className?: string }) {
  const { steps, completed, total, visible, dismiss } = useOnboardingProgress();
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  if (!visible) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <div
      className={cn(
        'w-[320px] rounded-md border border-border bg-card/95 backdrop-blur shadow-lg overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">Getting started</p>
          <p className="text-xs text-muted-foreground">
            {completed} of {total} complete
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            aria-label={open ? 'Collapse getting started' : 'Expand getting started'}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            aria-label="Dismiss getting started"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>

      {open ? (
        <ul className="divide-y divide-border">
          {steps.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => navigate(step.to)}
                className="w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-muted/50 transition-colors"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    step.done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-transparent'
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-sm',
                      step.done ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                  {!step.done && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        nextStep && (
          <button
            type="button"
            onClick={() => navigate(nextStep.to)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-foreground truncate">Next: {nextStep.title}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )
      )}
    </div>
  );
}
