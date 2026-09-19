import React from 'react';
import { 
  MessageSquare, Calendar, TrendingUp, HelpCircle, 
  Sparkles, Target, BarChart3, Clock, Hash, Lightbulb,
  Users, Zap, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StarterCategory {
  name: string;
  icon: React.ReactNode;
  gradient: string;
  prompts: string[];
}

interface ConversationStartersProps {
  onStarterClick: (prompt: string) => void;
  businessName?: string;
  platform?: string;
}

const starterCategories: StarterCategory[] = [
  {
    name: 'Quick Start',
    icon: <Zap className="w-5 h-5" />,
    gradient: 'from-primary/20 to-primary/5',
    prompts: [
      "What content should I post this week?",
      "Analyze my engagement trends",
    ],
  },
  {
    name: 'Strategy',
    icon: <Target className="w-5 h-5" />,
    gradient: 'from-accent-gold/20 to-accent-gold/5',
    prompts: [
      "Create a 14-day Instagram strategy",
      "Help me plan my content calendar",
    ],
  },
  {
    name: 'Analysis',
    icon: <BarChart3 className="w-5 h-5" />,
    gradient: 'from-accent-success/20 to-accent-success/5',
    prompts: [
      "Review my recent performance",
      "What content type works best for me?",
    ],
  },
  {
    name: 'Learning',
    icon: <HelpCircle className="w-5 h-5" />,
    gradient: 'from-primary/15 to-arasaka-red-light/10',
    prompts: [
      "How does the Instagram algorithm work?",
      "Best practices for hashtags",
    ],
  },
];

export function ConversationStarters({ 
  onStarterClick,
  businessName,
  platform,
}: ConversationStartersProps) {
  const getPersonalizedPrompts = () => {
    const prompts: string[] = [];
    if (businessName) {
      prompts.push(`What content themes work best for ${businessName}?`);
    }
    if (platform) {
      prompts.push(`Create a ${platform} growth strategy for me`);
    }
    return prompts;
  };

  const personalizedPrompts = getPersonalizedPrompts();

  return (
    <div className="space-y-5">
      {/* Personalized prompts */}
      {personalizedPrompts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Personalized for you
          </h3>
          <div className="flex flex-wrap gap-2">
            {personalizedPrompts.map((prompt, i) => (
              <button
                key={`personalized-${i}`}
                className="group flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 hover:from-primary/15 hover:to-primary/10 transition-all duration-200 text-foreground"
                onClick={() => onStarterClick(prompt)}
              >
                <Sparkles className="w-3 h-3 text-primary" />
                {prompt}
                <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {starterCategories.map((category) => (
          <div 
            key={category.name} 
            className="rounded-xl border border-subtle bg-secondary/50 backdrop-blur-sm overflow-hidden"
          >
            <div className={cn(
              'flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r',
              category.gradient
            )}>
              <span className="text-foreground">{category.icon}</span>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{category.name}</h3>
            </div>
            <div className="p-2">
              {category.prompts.map((prompt, i) => (
                <button
                  key={`${category.name}-${i}`}
                  className="group w-full flex items-center gap-2.5 text-xs py-2.5 px-3 rounded-lg text-left text-muted-foreground hover:text-foreground hover:bg-surface-tertiary transition-all duration-200"
                  onClick={() => onStarterClick(prompt)}
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  <span className="flex-1 truncate">{prompt}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick suggestion chips for active conversations
interface QuickSuggestionChipsProps {
  onChipClick: (prompt: string) => void;
  recentTopics?: string[];
}

const contextualSuggestions = [
  { prompt: "Tell me more", icon: <MessageSquare className="w-3 h-3" /> },
  { prompt: "Give me examples", icon: <Lightbulb className="w-3 h-3" /> },
  { prompt: "How do I implement this?", icon: <Target className="w-3 h-3" /> },
  { prompt: "What are the next steps?", icon: <Zap className="w-3 h-3" /> },
];

export function QuickSuggestionChips({ 
  onChipClick,
  recentTopics = [],
}: QuickSuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {contextualSuggestions.map((suggestion, i) => (
        <button
          key={i}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary/60 border border-subtle hover:border-primary/30 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200"
          onClick={() => onChipClick(suggestion.prompt)}
        >
          {suggestion.icon}
          {suggestion.prompt}
        </button>
      ))}
    </div>
  );
}