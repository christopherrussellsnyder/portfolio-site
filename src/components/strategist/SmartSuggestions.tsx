import React from 'react';
import { 
  BarChart3, Globe, Lightbulb, TrendingUp, TrendingDown, 
  AlertTriangle, Sparkles, Target, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusinessContext, AnalyticsUpload } from '@/pages/AIStrategist';

interface SmartSuggestion {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  text: string;
  prompt: string;
  action: 'upload_analytics' | 'analyze_website' | 'create_strategy' | 'ask_question';
  priority: 'high' | 'medium' | 'low';
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
}

interface SmartSuggestionsProps {
  businessContext: BusinessContext | null | undefined;
  recentAnalytics: AnalyticsUpload[];
  hasStrategies: boolean;
  onSuggestionClick: (suggestion: SmartSuggestion) => void;
}

export function SmartSuggestions({
  businessContext,
  recentAnalytics,
  hasStrategies,
  onSuggestionClick,
}: SmartSuggestionsProps) {
  const suggestions = generateSmartSuggestions(businessContext, recentAnalytics, hasStrategies);

  if (suggestions.length === 0) return null;

  // Sort by priority and take top 3
  const topSuggestions = suggestions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {topSuggestions.map((suggestion) => (
        <Button
          key={suggestion.id}
          variant="outline"
          size="sm"
          className="gap-2 h-auto py-2 px-3"
          onClick={() => onSuggestionClick(suggestion)}
        >
          <span className={suggestion.iconColor}>{suggestion.icon}</span>
          <span className="text-xs">{suggestion.text}</span>
          {suggestion.badge && (
            <Badge 
              variant={suggestion.badgeVariant || 'secondary'} 
              className="text-[10px] px-1.5 py-0"
            >
              {suggestion.badge}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}

function generateSmartSuggestions(
  businessContext: BusinessContext | null | undefined,
  recentAnalytics: AnalyticsUpload[],
  hasStrategies: boolean
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const profile = businessContext?.business_profile;
  const latestAnalytics = recentAnalytics[0];

  // No website analyzed
  if (!profile) {
    suggestions.push({
      id: 'analyze-website',
      icon: <Globe className="w-3.5 h-3.5" />,
      iconColor: 'text-blue-500',
      text: 'Analyze your website',
      prompt: 'I want to analyze my website to understand my business better',
      action: 'analyze_website',
      priority: 'high',
      badge: 'Start Here',
      badgeVariant: 'default',
    });
  }

  // No analytics uploaded
  if (!recentAnalytics.length) {
    suggestions.push({
      id: 'upload-analytics',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      iconColor: 'text-green-500',
      text: 'Upload analytics',
      prompt: 'I want to upload my analytics screenshot for insights',
      action: 'upload_analytics',
      priority: profile ? 'high' : 'medium',
      badge: 'Get Insights',
    });
  }

  // Has analytics but no strategy yet
  if (recentAnalytics.length > 0 && !hasStrategies) {
    suggestions.push({
      id: 'create-first-strategy',
      icon: <Lightbulb className="w-3.5 h-3.5" />,
      iconColor: 'text-yellow-500',
      text: 'Create your first strategy',
      prompt: 'Create a 14-day content strategy based on my analytics',
      action: 'create_strategy',
      priority: 'high',
      badge: 'Recommended',
      badgeVariant: 'default',
    });
  }

  // Check analytics health score
  if (latestAnalytics?.extracted_data) {
    const healthScore = latestAnalytics.extracted_data.overall_health_score;
    const engagementRate = latestAnalytics.extracted_data.engagement_rate;

    // Low health score
    if (healthScore && healthScore < 5) {
      suggestions.push({
        id: 'address-issues',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        iconColor: 'text-red-500',
        text: 'Address declining metrics',
        prompt: 'My performance metrics are declining. What should I do to fix this?',
        action: 'ask_question',
        priority: 'high',
        badge: 'Urgent',
        badgeVariant: 'destructive',
      });
    }

    // High performance
    if (healthScore && healthScore >= 8) {
      suggestions.push({
        id: 'capitalize-success',
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        iconColor: 'text-green-500',
        text: 'Capitalize on success',
        prompt: 'My performance is excellent! How can I maintain and build on this momentum?',
        action: 'ask_question',
        priority: 'medium',
        badge: 'Hot',
      });
    }

    // Above average engagement
    if (engagementRate && engagementRate > 3.5) {
      suggestions.push({
        id: 'engagement-strategy',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        iconColor: 'text-purple-500',
        text: 'Optimize high engagement',
        prompt: `My engagement rate is ${engagementRate}% which is above average. How can I leverage this?`,
        action: 'ask_question',
        priority: 'medium',
      });
    }
  }

  // Has profile and analytics - suggest strategy
  if (profile && recentAnalytics.length > 0 && hasStrategies) {
    suggestions.push({
      id: 'new-strategy',
      icon: <Target className="w-3.5 h-3.5" />,
      iconColor: 'text-orange-500',
      text: 'Generate new strategy',
      prompt: 'Create a new content strategy based on my latest performance data',
      action: 'create_strategy',
      priority: 'low',
    });
  }

  // Quick optimization tips
  if (profile) {
    suggestions.push({
      id: 'quick-tips',
      icon: <Zap className="w-3.5 h-3.5" />,
      iconColor: 'text-yellow-500',
      text: 'Quick wins for this week',
      prompt: 'What are some quick wins I can implement this week to improve my marketing?',
      action: 'ask_question',
      priority: 'low',
    });
  }

  return suggestions;
}

export type { SmartSuggestion };
