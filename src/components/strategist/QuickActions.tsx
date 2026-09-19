import React from 'react';
import { ImagePlus, Globe, Lightbulb } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface QuickActionsProps {
  onUploadClick: () => void;
  onWebsiteClick: () => void;
  onStrategyClick: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onUploadClick,
  onWebsiteClick,
  onStrategyClick,
  disabled,
}: QuickActionsProps) {
  const actions = [
    { icon: <ImagePlus className="w-4 h-4" />, onClick: onUploadClick, label: 'Upload analytics' },
    { icon: <Globe className="w-4 h-4" />, onClick: onWebsiteClick, label: 'Analyze website' },
    { icon: <Lightbulb className="w-4 h-4" />, onClick: onStrategyClick, label: 'Generate strategy' },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {actions.map((action, i) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <button
              onClick={action.onClick}
              disabled={disabled}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-tertiary disabled:opacity-40 transition-colors duration-200"
            >
              {action.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">{action.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}