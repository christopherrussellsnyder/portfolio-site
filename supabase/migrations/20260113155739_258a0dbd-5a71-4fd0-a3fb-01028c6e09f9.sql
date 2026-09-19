-- Create ab_test_learning table for pattern recognition and learning data
CREATE TABLE public.ab_test_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'content_length', 'media_type', 'tone', 'cta', 'timing', 'hashtags'
  pattern_value TEXT NOT NULL,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  avg_improvement NUMERIC DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  best_performing_time TEXT,
  best_performing_day INTEGER,
  sample_content JSONB DEFAULT '[]'::jsonb,
  performance_trend TEXT, -- 'improving', 'declining', 'stable'
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform_performance_benchmarks for tracking platform-specific performance
CREATE TABLE public.platform_performance_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'video', 'image', 'text', 'carousel'
  avg_engagement_rate NUMERIC DEFAULT 0,
  avg_likes NUMERIC DEFAULT 0,
  avg_shares NUMERIC DEFAULT 0,
  avg_comments NUMERIC DEFAULT 0,
  avg_ctr NUMERIC DEFAULT 0,
  avg_reach NUMERIC DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  optimal_posting_hours INTEGER[] DEFAULT '{}',
  optimal_posting_days INTEGER[] DEFAULT '{}',
  top_performing_hashtags TEXT[] DEFAULT '{}',
  top_performing_ctas TEXT[] DEFAULT '{}',
  best_content_length_range JSONB,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add platform-specific columns to ab_test_results if not exists
ALTER TABLE public.ab_test_results
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retweets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS replies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reactions JSONB,
ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saves INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS content_length INTEGER,
ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS posting_hour INTEGER,
ADD COLUMN IF NOT EXISTS posting_day INTEGER;

-- Add platform column to ab_tests table
ALTER TABLE public.ab_tests
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS auto_optimize BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS predicted_winner_id UUID,
ADD COLUMN IF NOT EXISTS prediction_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS learning_applied BOOLEAN DEFAULT false;

-- Add more columns to auto_ab_tests for tracking
ALTER TABLE public.auto_ab_tests
ADD COLUMN IF NOT EXISTS underperforming_paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS budget_reallocation JSONB,
ADD COLUMN IF NOT EXISTS performance_threshold NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS min_impressions_before_pause INTEGER DEFAULT 100;

-- Enable RLS
ALTER TABLE public.ab_test_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ab_test_learning
CREATE POLICY "Users can view own learning data" ON public.ab_test_learning
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own learning data" ON public.ab_test_learning
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning data" ON public.ab_test_learning
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning data" ON public.ab_test_learning
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for platform_performance_benchmarks
CREATE POLICY "Users can view own benchmarks" ON public.platform_performance_benchmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own benchmarks" ON public.platform_performance_benchmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own benchmarks" ON public.platform_performance_benchmarks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own benchmarks" ON public.platform_performance_benchmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_ab_test_learning_user_platform ON public.ab_test_learning(user_id, platform);
CREATE INDEX idx_ab_test_learning_pattern ON public.ab_test_learning(pattern_type, pattern_value);
CREATE INDEX idx_platform_benchmarks_user ON public.platform_performance_benchmarks(user_id, platform);
CREATE INDEX idx_ab_test_results_platform ON public.ab_test_results(platform);

-- Create trigger for updated_at
CREATE TRIGGER update_ab_test_learning_updated_at
  BEFORE UPDATE ON public.ab_test_learning
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();