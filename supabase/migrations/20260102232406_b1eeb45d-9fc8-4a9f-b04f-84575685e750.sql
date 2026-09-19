-- Create competitors table
CREATE TABLE IF NOT EXISTS public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  social_handles JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_user ON public.competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_active ON public.competitors(is_active);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitors" ON public.competitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own competitors" ON public.competitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own competitors" ON public.competitors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own competitors" ON public.competitors FOR DELETE USING (auth.uid() = user_id);

-- Create competitor benchmarks table
CREATE TABLE IF NOT EXISTS public.competitor_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE CASCADE,
  benchmark_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT NOT NULL,
  avg_posts_per_week NUMERIC DEFAULT 0,
  avg_engagement_rate NUMERIC DEFAULT 0,
  avg_post_length INTEGER DEFAULT 0,
  content_type_breakdown JSONB DEFAULT '{}'::jsonb,
  top_hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  posting_times JSONB DEFAULT '{}'::jsonb,
  strengths TEXT[] DEFAULT ARRAY[]::TEXT[],
  weaknesses TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, benchmark_date, platform)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_competitor ON public.competitor_benchmarks(competitor_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_date ON public.competitor_benchmarks(benchmark_date);
CREATE INDEX IF NOT EXISTS idx_benchmarks_user ON public.competitor_benchmarks(user_id);

ALTER TABLE public.competitor_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own benchmarks" ON public.competitor_benchmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own benchmarks" ON public.competitor_benchmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own benchmarks" ON public.competitor_benchmarks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own benchmarks" ON public.competitor_benchmarks FOR DELETE USING (auth.uid() = user_id);

-- Create industry benchmarks table
CREATE TABLE IF NOT EXISTS public.industry_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  platform TEXT NOT NULL,
  avg_engagement_rate NUMERIC NOT NULL,
  avg_posts_per_week NUMERIC NOT NULL,
  avg_follower_growth NUMERIC DEFAULT 0,
  top_content_types JSONB DEFAULT '{}'::jsonb,
  benchmark_month DATE NOT NULL,
  sample_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry, platform, benchmark_month)
);

CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_industry ON public.industry_benchmarks(industry);
CREATE INDEX IF NOT EXISTS idx_industry_benchmarks_platform ON public.industry_benchmarks(platform);

ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view industry benchmarks" ON public.industry_benchmarks FOR SELECT USING (true);

-- Insert sample industry benchmarks
INSERT INTO public.industry_benchmarks (industry, platform, avg_engagement_rate, avg_posts_per_week, top_content_types, benchmark_month, sample_size) VALUES
('technology', 'twitter', 2.5, 7, '{"video": 3.2, "image": 2.8, "text": 2.1}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 1000),
('technology', 'linkedin', 3.5, 5, '{"article": 4.2, "image": 3.8, "video": 3.5}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 1000),
('ecommerce', 'instagram', 4.5, 10, '{"image": 5.2, "video": 4.8, "carousel": 4.3}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 800),
('ecommerce', 'facebook', 2.0, 8, '{"video": 2.5, "image": 2.2, "text": 1.5}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 800),
('saas', 'twitter', 2.8, 8, '{"video": 3.5, "image": 3.0, "text": 2.3}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 600),
('saas', 'linkedin', 4.0, 6, '{"article": 5.0, "video": 4.5, "image": 3.8}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 600),
('marketing', 'twitter', 3.0, 9, '{"video": 3.8, "image": 3.2, "text": 2.5}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 500),
('marketing', 'instagram', 5.0, 12, '{"video": 6.0, "image": 5.5, "carousel": 4.8}'::jsonb, DATE_TRUNC('month', CURRENT_DATE), 500)
ON CONFLICT (industry, platform, benchmark_month) DO NOTHING;

-- Create compare_to_industry function
CREATE OR REPLACE FUNCTION public.compare_to_industry(
  p_user_id UUID,
  p_industry TEXT,
  p_platform TEXT DEFAULT 'all'
)
RETURNS TABLE (
  metric TEXT,
  user_value NUMERIC,
  industry_avg NUMERIC,
  percentile NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_engagement NUMERIC;
  v_user_posts_per_week NUMERIC;
  v_industry_engagement NUMERIC;
  v_industry_posts NUMERIC;
BEGIN
  -- Get user metrics from scheduled_posts
  SELECT 
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ), 2),
    ROUND((COUNT(*)::NUMERIC / 
      GREATEST(
        EXTRACT(EPOCH FROM (MAX(published_at) - MIN(published_at))) / (7 * 24 * 60 * 60),
        1
      )), 2)
  INTO v_user_engagement, v_user_posts_per_week
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND published_at > NOW() - INTERVAL '90 days'
    AND (p_platform = 'all' OR p_platform = ANY(platforms));
  
  -- Get industry averages
  SELECT 
    COALESCE(AVG(avg_engagement_rate), 2.5),
    COALESCE(AVG(avg_posts_per_week), 7)
  INTO v_industry_engagement, v_industry_posts
  FROM industry_benchmarks
  WHERE industry = p_industry
    AND (p_platform = 'all' OR platform = p_platform);
  
  -- Return engagement rate comparison
  RETURN QUERY
  SELECT
    'engagement_rate'::TEXT,
    COALESCE(v_user_engagement, 0),
    v_industry_engagement,
    CASE 
      WHEN COALESCE(v_user_engagement, 0) >= v_industry_engagement * 1.2 THEN 90::NUMERIC
      WHEN COALESCE(v_user_engagement, 0) >= v_industry_engagement THEN 70::NUMERIC
      WHEN COALESCE(v_user_engagement, 0) >= v_industry_engagement * 0.8 THEN 50::NUMERIC
      ELSE 30::NUMERIC
    END,
    CASE 
      WHEN COALESCE(v_user_engagement, 0) >= v_industry_engagement THEN 'above'
      ELSE 'below'
    END::TEXT;
  
  -- Return posts per week comparison
  RETURN QUERY
  SELECT
    'posts_per_week'::TEXT,
    COALESCE(v_user_posts_per_week, 0),
    v_industry_posts,
    CASE 
      WHEN COALESCE(v_user_posts_per_week, 0) >= v_industry_posts * 1.2 THEN 90::NUMERIC
      WHEN COALESCE(v_user_posts_per_week, 0) >= v_industry_posts THEN 70::NUMERIC
      WHEN COALESCE(v_user_posts_per_week, 0) >= v_industry_posts * 0.8 THEN 50::NUMERIC
      ELSE 30::NUMERIC
    END,
    CASE 
      WHEN COALESCE(v_user_posts_per_week, 0) >= v_industry_posts THEN 'above'
      ELSE 'below'
    END::TEXT;
END;
$$;

-- Create generate_competitive_insights function
CREATE OR REPLACE FUNCTION public.generate_competitive_insights(
  p_user_id UUID,
  p_industry TEXT
)
RETURNS TABLE (
  insight_type TEXT,
  title TEXT,
  description TEXT,
  recommendation TEXT,
  priority TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comparison RECORD;
BEGIN
  FOR v_comparison IN 
    SELECT * FROM compare_to_industry(p_user_id, p_industry, 'all')
  LOOP
    IF v_comparison.metric = 'engagement_rate' AND v_comparison.status = 'below' THEN
      RETURN QUERY SELECT
        'engagement'::TEXT,
        'Engagement below industry average'::TEXT,
        format('Your %s%% is below the %s industry average of %s%%', 
          v_comparison.user_value, p_industry, v_comparison.industry_avg),
        'Focus on video content and questions to boost engagement'::TEXT,
        'high'::TEXT;
    END IF;
    
    IF v_comparison.metric = 'posts_per_week' AND v_comparison.status = 'below' THEN
      RETURN QUERY SELECT
        'frequency'::TEXT,
        'Posting less than competitors'::TEXT,
        format('You post %s times/week vs industry average of %s', 
          v_comparison.user_value, v_comparison.industry_avg),
        'Increase posting frequency to maintain visibility'::TEXT,
        'medium'::TEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;