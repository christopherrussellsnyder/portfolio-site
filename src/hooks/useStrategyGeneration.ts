import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface StrategicApproach {
  core_strategy?: string;
  key_differentiator?: string;
  competitive_edge?: string;
}

export interface SuccessMilestones {
  week_1?: string;
  week_2?: string;
  week_3?: string;
  week_4?: string;
}

export interface RiskAssessment {
  potential_challenges?: string[];
  mitigation_strategies?: string[];
  pivot_triggers?: string[];
}

export interface ImplementationGuide {
  posting_schedule?: string;
  content_creation_timeline?: string;
  engagement_protocol?: string;
  monitoring_schedule?: string;
  adjustment_criteria?: string;
}

export interface WeeklyBreakdown {
  week: number;
  theme: string;
  objective: string;
  post_count: number;
  key_messages?: string[];
  expected_metrics?: {
    reach?: number;
    engagement_rate?: number;
    follower_growth?: number;
  };
  focus_areas?: string[];
}

export interface PredictedMetrics {
  total_reach?: number;
  total_impressions?: number;
  avg_engagement_rate?: number;
  expected_follower_growth?: number;
  expected_follower_growth_percentage?: number;
  expected_profile_visits?: number;
  expected_website_clicks?: number;
  expected_conversions?: number;
}

export interface StrategyOverview {
  id: string;
  title: string;
  platform: string | null;
  duration_days: number;
  start_date: string;
  end_date: string;
  goals?: string[] | null;
  content_mix?: Record<string, number> | null;
  predicted_metrics?: PredictedMetrics | null;
  created_at?: string;
  user_id?: string;
  // Enhanced fields
  strategic_approach?: StrategicApproach | null;
  weekly_breakdown?: WeeklyBreakdown[] | null;
  key_tactics?: string[] | null;
  success_milestones?: SuccessMilestones | null;
  risk_assessment?: RiskAssessment | null;
  implementation_guide?: ImplementationGuide | null;
  post_type_distribution?: Record<string, number> | null;
  theme_distribution?: Record<string, number> | null;
  recommended_campaign_structure?: Record<string, any> | null;
  version?: number;
}

export interface HashtagMix {
  high_volume?: string[];
  medium_volume?: string[];
  niche?: string[];
  branded?: string[];
}

export interface VisualGuidance {
  visual_type?: string;
  description?: string;
  color_palette?: string;
  text_overlay?: string;
  attention_hook?: string;
}

export interface StrategicRationale {
  why_this_day?: string;
  arc_positioning?: string;
  builds_toward?: string;
  success_metrics?: string;
}

export interface OptimizationTips {
  engagement_boosters?: string[];
  a_b_test_ideas?: string[];
  potential_issues?: string[];
  risk_mitigation?: string[];
}

export interface StrategyPost {
  id: string;
  strategy_id: string;
  day_number: number;
  post_date: string;
  post_time: string | null;
  post_type: string | null;
  theme: string | null;
  hook: string | null;
  caption: string;
  hashtags: string[] | null;
  cta: string | null;
  predicted_reach: number | null;
  predicted_engagement: number | null;
  rationale: string | null;
  sort_order: number | null;
  // Enhanced fields
  week_number?: number | null;
  week_theme?: string | null;
  content_category?: string | null;
  primary_emotion?: string | null;
  content_pillar?: string | null;
  hook_technique?: string | null;
  hook_principle?: string | null;
  opening_text?: string | null;
  body_text?: string | null;
  cta_type?: string | null;
  cta_strength?: string | null;
  hashtag_mix?: HashtagMix | null;
  visual_guidance?: VisualGuidance | null;
  predicted_impressions?: number | null;
  predicted_likes?: number | null;
  predicted_comments?: number | null;
  predicted_shares?: number | null;
  predicted_saves?: number | null;
  performance_confidence?: string | null;
  prediction_basis?: string | null;
  strategic_rationale?: StrategicRationale | null;
  optimization_tips?: OptimizationTips | null;
  is_edited?: boolean;
  edited_at?: string | null;
}

export interface GeneratedStrategy {
  strategyId: string;
  strategy: StrategyOverview;
  weeklyBreakdown?: WeeklyBreakdown[];
  postsCount: number;
}

export function useStrategyGeneration() {
  const { activeWorkspaceId } = useWorkspace();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedStrategy, setGeneratedStrategy] = useState<GeneratedStrategy | null>(null);

  const generateStrategy = async (
    platform: string,
    durationDays: number = 30,
    goals?: string[],
    customInstructions?: string,
    conversationId?: string,
    contentMode: 'organic' | 'paid' | 'hybrid' = 'hybrid'
  ): Promise<GeneratedStrategy | null> => {
    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Analyzing business context...');
    setGeneratedStrategy(null);

    try {
      // Simulate detailed progress
      const progressStages = [
        { progress: 10, message: 'Analyzing business context...' },
        { progress: 25, message: 'Designing content arc...' },
        { progress: 40, message: 'Creating Week 1 posts...' },
        { progress: 55, message: 'Creating Week 2 posts...' },
        { progress: 70, message: 'Creating Week 3 posts...' },
        { progress: 85, message: 'Creating Week 4 posts...' },
        { progress: 95, message: 'Finalizing strategy...' },
      ];

      let stageIndex = 0;
      const progressInterval = setInterval(() => {
        if (stageIndex < progressStages.length) {
          setProgress(progressStages[stageIndex].progress);
          setProgressMessage(progressStages[stageIndex].message);
          stageIndex++;
        }
      }, 8000);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-strategy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            platform,
            durationDays,
            goals,
            customInstructions,
            conversationId,
            contentMode,
            workspace_id: activeWorkspaceId,
          }),
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const serverMsg = errorData.error as string | undefined;
        const code = errorData.code as string | undefined;
        const err: any = new Error(
          serverMsg ||
            (response.status === 429
              ? 'Rate limit exceeded. Please wait a moment and try again.'
              : response.status === 402
              ? 'Payment required.'
              : `Failed to generate strategy (HTTP ${response.status})`)
        );
        err.status = response.status;
        err.code = code;
        throw err;
      }

      const data = await response.json();
      setProgress(100);
      setProgressMessage('Strategy complete!');

      const result: GeneratedStrategy = {
        strategyId: data.strategyId,
        strategy: data.strategy,
        weeklyBreakdown: data.weeklyBreakdown,
        postsCount: data.postsCount,
      };

      setGeneratedStrategy(result);
      
      toast({
        title: 'Strategy Generated!',
        description: `Created ${data.postsCount} detailed posts for your ${durationDays}-day ${platform} strategy.`,
      });

      return result;
    } catch (error: any) {
      console.error('Strategy generation error:', error);
      const code = error?.code as string | undefined;
      const message = error instanceof Error ? error.message : 'Failed to generate strategy';

      // Sales funnel: plan-limit or credit-depletion opens the upgrade modal instead of a raw toast.
      if (code === 'UPGRADE_REQUIRED' || code === 'AI_CREDITS_DEPLETED') {
        window.dispatchEvent(
          new CustomEvent('korex:upgrade-required', {
            detail: { reason: code, message },
          })
        );
      } else {
        toast({
          title: 'Generation Failed',
          description: message,
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setIsGenerating(false);
      setProgressMessage('');
    }
  };

  const fetchStrategy = async (strategyId: string) => {
    const { data: strategy, error } = await supabase
      .from('content_strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (error) {
      console.error('Error fetching strategy:', error);
      return null;
    }

    const { data: posts, error: postsError } = await supabase
      .from('strategy_posts')
      .select('*')
      .eq('strategy_id', strategyId)
      .order('day_number', { ascending: true });

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return null;
    }

    return {
      strategy: {
        ...strategy,
        goals: Array.isArray(strategy.goals) ? strategy.goals : [],
        content_mix: strategy.content_mix as Record<string, number> | null,
        predicted_metrics: strategy.predicted_metrics as PredictedMetrics | null,
        strategic_approach: strategy.strategic_approach as StrategicApproach | null,
        weekly_breakdown: strategy.weekly_breakdown as unknown as WeeklyBreakdown[] | null,
        key_tactics: strategy.key_tactics as string[] | null,
        success_milestones: strategy.success_milestones as SuccessMilestones | null,
        risk_assessment: strategy.risk_assessment as RiskAssessment | null,
        implementation_guide: strategy.implementation_guide as ImplementationGuide | null,
        post_type_distribution: strategy.post_type_distribution as Record<string, number> | null,
        theme_distribution: strategy.theme_distribution as Record<string, number> | null,
        recommended_campaign_structure: (strategy as any).recommended_campaign_structure as Record<string, any> | null,
      } as StrategyOverview,
      posts: posts.map(post => ({
        ...post,
        hashtag_mix: post.hashtag_mix as unknown as HashtagMix | null,
        visual_guidance: post.visual_guidance as unknown as VisualGuidance | null,
        strategic_rationale: post.strategic_rationale as unknown as StrategicRationale | null,
        optimization_tips: post.optimization_tips as unknown as OptimizationTips | null,
      })) as StrategyPost[],
    };
  };

  const fetchAllStrategies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let q = supabase
      .from('content_strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (activeWorkspaceId) q = q.eq('workspace_id', activeWorkspaceId);
    const { data, error } = await q;

    if (error) {
      console.error('Error fetching strategies:', error);
      return [];
    }

    return data;
  };

  const deleteStrategy = async (strategyId: string) => {
    await supabase
      .from('strategy_posts')
      .delete()
      .eq('strategy_id', strategyId);

    const { error } = await supabase
      .from('content_strategies')
      .delete()
      .eq('id', strategyId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete strategy',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Strategy Deleted',
      description: 'The strategy has been removed.',
    });
    return true;
  };

  const updatePost = async (postId: string, updates: Partial<StrategyPost>) => {
    // Convert custom types to JSON-compatible format for Supabase
    const supabaseUpdates: Record<string, unknown> = {
      is_edited: true,
      edited_at: new Date().toISOString(),
    };
    
    // Only include simple fields that are safe to update
    const safeFields = [
      'hook', 'caption', 'cta', 'post_time', 'post_type', 'theme',
      'content_category', 'primary_emotion', 'hook_technique', 'hook_principle',
      'opening_text', 'body_text', 'cta_type', 'cta_strength',
    ];
    
    for (const field of safeFields) {
      if (field in updates) {
        supabaseUpdates[field] = updates[field as keyof StrategyPost];
      }
    }
    
    if (updates.hashtags) {
      supabaseUpdates.hashtags = updates.hashtags;
    }

    const { error } = await supabase
      .from('strategy_posts')
      .update(supabaseUpdates)
      .eq('id', postId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update post',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Post Updated',
      description: 'Your changes have been saved.',
    });
    return true;
  };

  return {
    generateStrategy,
    fetchStrategy,
    fetchAllStrategies,
    deleteStrategy,
    updatePost,
    isGenerating,
    progress,
    progressMessage,
    generatedStrategy,
  };
}
