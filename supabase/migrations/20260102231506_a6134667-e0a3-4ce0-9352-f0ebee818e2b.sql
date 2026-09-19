-- Campaign performance tracking table
CREATE TABLE IF NOT EXISTS public.campaign_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posts_published INTEGER DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  platform_breakdown JSONB DEFAULT '{}'::jsonb,
  goal_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, tracked_date)
);

-- Enable RLS
ALTER TABLE public.campaign_performance_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their campaign tracking" ON public.campaign_performance_tracking
  FOR SELECT USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their campaign tracking" ON public.campaign_performance_tracking
  FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their campaign tracking" ON public.campaign_performance_tracking
  FOR UPDATE USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their campaign tracking" ON public.campaign_performance_tracking
  FOR DELETE USING (
    campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_tracking_campaign ON public.campaign_performance_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tracking_date ON public.campaign_performance_tracking(tracked_date);

-- Add goals column to campaigns if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'goals') THEN
    ALTER TABLE public.campaigns ADD COLUMN goals JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'description') THEN
    ALTER TABLE public.campaigns ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'budget') THEN
    ALTER TABLE public.campaigns ADD COLUMN budget NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Function to calculate campaign performance
CREATE OR REPLACE FUNCTION public.calculate_campaign_performance(p_campaign_id UUID)
RETURNS TABLE (
  total_posts BIGINT,
  total_impressions BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate NUMERIC,
  goal_completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_goals JSONB;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_goals := COALESCE(v_campaign.goals, '{}'::jsonb);
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(sp.impressions), 0)::BIGINT,
    COALESCE(SUM(sp.engagements), 0)::BIGINT,
    CASE 
      WHEN SUM(sp.impressions) > 0 
      THEN ROUND((SUM(sp.engagements)::NUMERIC / SUM(sp.impressions)::NUMERIC * 100), 2)
      ELSE 0
    END,
    CASE
      WHEN v_goals->>'impressions' IS NOT NULL AND (v_goals->>'impressions')::NUMERIC > 0
      THEN ROUND((COALESCE(SUM(sp.impressions), 0)::NUMERIC / (v_goals->>'impressions')::NUMERIC * 100), 2)
      ELSE 0
    END
  FROM scheduled_posts sp
  WHERE sp.campaign_id = p_campaign_id
    AND sp.status = 'published';
END;
$$;

-- Function to generate campaign strategy based on user patterns
CREATE OR REPLACE FUNCTION public.get_campaign_strategy_data(p_user_id UUID, p_platform TEXT DEFAULT 'all')
RETURNS TABLE (
  best_content_type TEXT,
  best_content_length TEXT,
  best_posting_time TEXT,
  avg_engagement_rate NUMERIC,
  total_posts_analyzed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH pattern_data AS (
    SELECT 
      pattern_type,
      pattern_value,
      avg_engagement_rate as eng_rate,
      post_count,
      ROW_NUMBER() OVER (PARTITION BY pattern_type ORDER BY avg_engagement_rate DESC) as rn
    FROM content_performance_patterns
    WHERE user_id = p_user_id
      AND (p_platform = 'all' OR platform = p_platform)
  ),
  best_patterns AS (
    SELECT pattern_type, pattern_value, eng_rate
    FROM pattern_data
    WHERE rn = 1
  )
  SELECT
    COALESCE((SELECT pattern_value FROM best_patterns WHERE pattern_type = 'content_type'), 'image'),
    COALESCE((SELECT pattern_value FROM best_patterns WHERE pattern_type = 'content_length'), 'medium'),
    COALESCE((SELECT pattern_value FROM best_patterns WHERE pattern_type = 'posting_time'), 'afternoon'),
    COALESCE((SELECT AVG(eng_rate) FROM best_patterns), 2.5),
    COALESCE((SELECT SUM(post_count)::INTEGER FROM pattern_data WHERE rn = 1), 0);
END;
$$;