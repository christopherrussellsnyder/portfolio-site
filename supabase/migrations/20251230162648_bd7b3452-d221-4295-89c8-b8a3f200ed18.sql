-- Function to get user's top performing posts
CREATE OR REPLACE FUNCTION get_top_performing_posts(
  p_user_id UUID,
  p_platform TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  published_at TIMESTAMPTZ,
  engagement_rate NUMERIC,
  total_engagement INTEGER,
  impressions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.content,
    sp.published_at,
    CASE 
      WHEN sp.impressions > 0 
      THEN (sp.engagements::NUMERIC / sp.impressions::NUMERIC * 100)
      ELSE 0
    END as engagement_rate,
    sp.engagements as total_engagement,
    sp.impressions
  FROM scheduled_posts sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'published'
    AND sp.impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(sp.platforms))
  ORDER BY engagement_rate DESC
  LIMIT p_limit;
END;
$$;

-- Function to analyze content patterns
CREATE OR REPLACE FUNCTION analyze_content_patterns(
  p_user_id UUID,
  p_platform TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patterns JSONB;
  v_avg_length INTEGER;
  v_avg_engagement NUMERIC;
BEGIN
  -- Calculate average successful post length
  SELECT AVG(LENGTH(content))::INTEGER
  INTO v_avg_length
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND engagements > 0
    AND impressions > 0
    AND (engagements::NUMERIC / impressions::NUMERIC * 100) > 3.0;
  
  -- Calculate average engagement
  SELECT AVG(engagements::NUMERIC / NULLIF(impressions, 0)::NUMERIC * 100)
  INTO v_avg_engagement
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND impressions > 0;
  
  -- Build patterns JSON
  v_patterns := jsonb_build_object(
    'avgSuccessfulLength', COALESCE(v_avg_length, 150),
    'avgEngagementRate', COALESCE(v_avg_engagement, 2.5),
    'totalPostsAnalyzed', (
      SELECT COUNT(*) FROM scheduled_posts 
      WHERE user_id = p_user_id AND status = 'published'
    )
  );
  
  RETURN v_patterns;
END;
$$;

-- AI Generation Logs table
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  variations_generated INTEGER DEFAULT 1,
  top_variant TEXT,
  predicted_engagement NUMERIC,
  success_patterns_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert own generation logs"
ON ai_generation_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own generation logs"
ON ai_generation_logs FOR SELECT
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_gen_logs_user ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_gen_logs_created ON ai_generation_logs(created_at DESC);