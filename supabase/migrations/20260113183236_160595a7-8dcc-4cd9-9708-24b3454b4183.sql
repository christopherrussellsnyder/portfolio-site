-- Create campaign_content_calendar table for 30-day content plans
CREATE TABLE IF NOT EXISTS public.campaign_content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 30),
  post_date DATE,
  post_time_recommended TIME,
  platform TEXT NOT NULL,
  content_hook TEXT,
  content_body TEXT,
  content_cta TEXT,
  content_type TEXT DEFAULT 'image',
  content_theme TEXT,
  target_audience_segment TEXT,
  expected_engagement_score NUMERIC,
  reasoning TEXT,
  post_status TEXT DEFAULT 'draft',
  actual_performance_metrics JSONB DEFAULT '{}',
  ml_confidence_score NUMERIC,
  platform_specific_tips TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  media_suggestions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create campaign_ai_strategies table for storing generated strategies
CREATE TABLE IF NOT EXISTS public.campaign_ai_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  business_profile_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  niche TEXT,
  objective TEXT,
  strategy_data JSONB NOT NULL DEFAULT '{}',
  weekly_themes JSONB DEFAULT '[]',
  predicted_metrics JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  generation_status TEXT DEFAULT 'pending',
  generation_progress INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ai_strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_content_calendar
CREATE POLICY "Users can view own content calendar"
  ON public.campaign_content_calendar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content calendar"
  ON public.campaign_content_calendar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content calendar"
  ON public.campaign_content_calendar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content calendar"
  ON public.campaign_content_calendar FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for campaign_ai_strategies
CREATE POLICY "Users can view own ai strategies"
  ON public.campaign_ai_strategies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai strategies"
  ON public.campaign_ai_strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai strategies"
  ON public.campaign_ai_strategies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai strategies"
  ON public.campaign_ai_strategies FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_calendar_campaign ON public.campaign_content_calendar(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_user ON public.campaign_content_calendar(user_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON public.campaign_content_calendar(post_date);
CREATE INDEX IF NOT EXISTS idx_ai_strategies_user ON public.campaign_ai_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_strategies_campaign ON public.campaign_ai_strategies(campaign_id);