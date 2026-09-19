import React from 'react';
import { 
  Calendar, ExternalLink, Copy, 
  Lightbulb, RefreshCw, Bookmark,
  CheckCircle2, XCircle, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ActionButtonsProps {
  content: string;
  onAction?: (action: string, data?: any) => void;
  hasPendingStrategy?: boolean;
}

interface DetectedAction {
  type: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  className?: string;
}

export function ActionButtons({ content, onAction, hasPendingStrategy }: ActionButtonsProps) {
  const navigate = useNavigate();
  
  const detectActions = (): DetectedAction[] => {
    const actions: DetectedAction[] = [];
    const lowerContent = content.toLowerCase();

    // If there's a pending strategy and the AI is asking for confirmation
    if (hasPendingStrategy && (
      lowerContent.includes('confirm') || 
      lowerContent.includes('is this correct') || 
      lowerContent.includes('ready to proceed') ||
      lowerContent.includes('shall i') ||
      lowerContent.includes('would you like me to generate') ||
      lowerContent.includes('please confirm') ||
      lowerContent.includes('proceed with') ||
      lowerContent.includes('generate your') ||
      lowerContent.includes('strategy') 
    )) {
      actions.push({
        type: 'confirm_strategy',
        label: '✅ Confirm & Generate Strategy',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        action: () => onAction?.('confirm_strategy'),
        variant: 'default',
        className: 'bg-gradient-to-r from-primary to-arasaka-red-dark hover:shadow-glow text-primary-foreground',
      });
      actions.push({
        type: 'edit_settings',
        label: '⚙️ Update Settings',
        icon: <Settings className="w-3.5 h-3.5" />,
        action: () => onAction?.('edit_settings'),
        variant: 'outline',
      });
      actions.push({
        type: 'cancel_strategy',
        label: '❌ Cancel',
        icon: <XCircle className="w-3.5 h-3.5" />,
        action: () => onAction?.('cancel_strategy'),
        variant: 'outline',
      });
      return actions;
    }

    // Detect strategy-related actions
    if (lowerContent.includes('strategy') || lowerContent.includes('14-day') || lowerContent.includes('content plan')) {
      if (lowerContent.includes('created') || lowerContent.includes('generated') || lowerContent.includes('successfully')) {
        const strategyMatch = content.match(/\/strategies\/([a-f0-9-]+)/i);
        if (strategyMatch) {
          actions.push({
            type: 'view_strategy',
            label: 'View Full Strategy',
            icon: <Calendar className="w-3.5 h-3.5" />,
            action: () => navigate(`/strategies/${strategyMatch[1]}`),
            variant: 'default',
          });
        }
      } else if (!hasPendingStrategy && (lowerContent.includes('would you like') || lowerContent.includes('want me to'))) {
        actions.push({
          type: 'create_strategy',
          label: 'Yes, Create Strategy',
          icon: <Lightbulb className="w-3.5 h-3.5" />,
          action: () => onAction?.('create_strategy'),
          variant: 'default',
        });
      }
    }

    // Detect content suggestions
    if (
      (lowerContent.includes('post') || lowerContent.includes('caption')) &&
      (lowerContent.includes('here') || lowerContent.includes('example') || lowerContent.includes(':'))
    ) {
      actions.push({
        type: 'copy_content',
        label: 'Copy Content',
        icon: <Copy className="w-3.5 h-3.5" />,
        action: () => {
          navigator.clipboard.writeText(extractContentFromResponse(content));
          toast({
            title: 'Copied!',
            description: 'Content copied to clipboard',
          });
        },
      });

      actions.push({
        type: 'save_content',
        label: 'Save to Library',
        icon: <Bookmark className="w-3.5 h-3.5" />,
        action: () => onAction?.('save_content', { content: extractContentFromResponse(content) }),
      });
    }

    // Detect analytics recommendation
    if (lowerContent.includes('upload') && lowerContent.includes('analytics')) {
      actions.push({
        type: 'upload_analytics',
        label: 'Upload Analytics',
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        action: () => onAction?.('upload_analytics'),
      });
    }

    // Detect website analysis recommendation
    if (lowerContent.includes('analyze') && lowerContent.includes('website')) {
      actions.push({
        type: 'analyze_website',
        label: 'Analyze Website',
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        action: () => onAction?.('analyze_website'),
      });
    }

    // Detect revision offer
    if (lowerContent.includes('adjust') || lowerContent.includes('modify') || lowerContent.includes('change')) {
      actions.push({
        type: 'request_revision',
        label: 'Request Revision',
        icon: <RefreshCw className="w-3.5 h-3.5" />,
        action: () => onAction?.('request_revision'),
      });
    }

    return actions.slice(0, 3);
  };

  const actions = detectActions();

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
      {actions.map((action, i) => (
        <Button
          key={i}
          variant={action.variant || 'outline'}
          size="sm"
          className={`text-xs gap-1.5 h-8 ${action.className || ''}`}
          onClick={action.action}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function extractContentFromResponse(content: string): string {
  const codeBlockMatch = content.match(/```[\s\S]*?```/g);
  if (codeBlockMatch) {
    return codeBlockMatch.map(block => block.replace(/```/g, '').trim()).join('\n\n');
  }

  const quoteMatch = content.match(/"([^"]+)"/g);
  if (quoteMatch) {
    return quoteMatch.map(q => q.replace(/"/g, '')).join('\n');
  }

  const introPatterns = [
    /here['']?s? (?:a|an|the|your)[^:]*:/i,
    /try this:/i,
    /example:/i,
    /suggested (?:caption|post|content):/i,
  ];

  for (const pattern of introPatterns) {
    const match = content.match(pattern);
    if (match) {
      return content.slice(content.indexOf(match[0]) + match[0].length).trim();
    }
  }

  return content;
}
