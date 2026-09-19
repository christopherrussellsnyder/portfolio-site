-- Add enhanced columns to strategy_posts table for comprehensive strategy generation
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS week_number integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS week_theme text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS content_category text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS primary_emotion text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS content_pillar text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS hook_technique text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS hook_principle text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS opening_text text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS body_text text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS cta_type text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS cta_strength text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS hashtag_mix jsonb;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS visual_guidance jsonb;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS predicted_impressions integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS predicted_likes integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS predicted_comments integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS predicted_shares integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS predicted_saves integer;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS performance_confidence text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS prediction_basis text;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS strategic_rationale jsonb;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS optimization_tips jsonb;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add enhanced columns to content_strategies table for strategy metadata
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS strategic_approach jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS weekly_breakdown jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS key_tactics text[];
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS success_milestones jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS risk_assessment jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS implementation_guide jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS post_type_distribution jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS theme_distribution jsonb;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS predicted_impressions integer;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS predicted_website_clicks integer;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS predicted_conversions integer;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS parent_strategy_id uuid REFERENCES public.content_strategies(id);

-- Add index for performance queries
CREATE INDEX IF NOT EXISTS idx_strategy_posts_week ON public.strategy_posts(strategy_id, week_number);
CREATE INDEX IF NOT EXISTS idx_strategy_posts_performance ON public.strategy_posts(predicted_engagement DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_content_strategies_user_created ON public.content_strategies(user_id, created_at DESC);