-- Create content_performance_patterns table
CREATE TABLE IF NOT EXISTS content_performance_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_value TEXT NOT NULL,
  post_count INTEGER DEFAULT 0,
  avg_engagement_rate NUMERIC DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  performance_score NUMERIC DEFAULT 0,
  sample_posts JSONB DEFAULT '[]'::jsonb,
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, pattern_type, pattern_value)
);

-- Create indexes
CREATE INDEX idx_patterns_user ON content_performance_patterns(user_id);
CREATE INDEX idx_patterns_platform ON content_performance_patterns(platform);
CREATE INDEX idx_patterns_type ON content_performance_patterns(pattern_type);
CREATE INDEX idx_patterns_score ON content_performance_patterns(performance_score DESC);

-- Enable RLS
ALTER TABLE content_performance_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own patterns"
  ON content_performance_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patterns"
  ON content_performance_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patterns"
  ON content_performance_patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patterns"
  ON content_performance_patterns FOR DELETE
  USING (auth.uid() = user_id);

-- Function to analyze content patterns comprehensively
CREATE OR REPLACE FUNCTION analyze_content_patterns_comprehensive(p_user_id UUID, p_platform TEXT DEFAULT 'all')
RETURNS TABLE (
  pattern_type TEXT,
  pattern_value TEXT,
  post_count BIGINT,
  avg_engagement_rate NUMERIC,
  performance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing patterns for this user
  DELETE FROM content_performance_patterns WHERE user_id = p_user_id;
  
  -- Analyze content type patterns
  INSERT INTO content_performance_patterns (
    user_id, platform, pattern_type, pattern_value, post_count, 
    avg_engagement_rate, total_impressions, total_engagement, performance_score
  )
  SELECT
    p_user_id,
    COALESCE(platforms[1], 'all'),
    'content_type',
    CASE
      WHEN media_urls IS NULL OR array_length(media_urls, 1) IS NULL THEN 'text_only'
      WHEN EXISTS (SELECT 1 FROM unnest(media_urls) url WHERE url ~ '\.(mp4|mov|avi|webm)$') THEN 'video'
      WHEN EXISTS (SELECT 1 FROM unnest(media_urls) url WHERE url ~ '\.(jpg|jpeg|png|gif|webp)$') THEN 'image'
      ELSE 'text_only'
    END as content_type,
    COUNT(*)::BIGINT,
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ), 2),
    COALESCE(SUM(impressions), 0),
    COALESCE(SUM(engagements), 0),
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ) * (COUNT(*)::NUMERIC / 10), 2)
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(platforms))
    AND published_at > NOW() - INTERVAL '90 days'
  GROUP BY 
    COALESCE(platforms[1], 'all'),
    CASE
      WHEN media_urls IS NULL OR array_length(media_urls, 1) IS NULL THEN 'text_only'
      WHEN EXISTS (SELECT 1 FROM unnest(media_urls) url WHERE url ~ '\.(mp4|mov|avi|webm)$') THEN 'video'
      WHEN EXISTS (SELECT 1 FROM unnest(media_urls) url WHERE url ~ '\.(jpg|jpeg|png|gif|webp)$') THEN 'image'
      ELSE 'text_only'
    END;
  
  -- Analyze content length patterns
  INSERT INTO content_performance_patterns (
    user_id, platform, pattern_type, pattern_value, post_count, 
    avg_engagement_rate, total_impressions, total_engagement, performance_score
  )
  SELECT
    p_user_id,
    COALESCE(platforms[1], 'all'),
    'content_length',
    CASE
      WHEN LENGTH(content) < 100 THEN 'short'
      WHEN LENGTH(content) < 200 THEN 'medium'
      ELSE 'long'
    END,
    COUNT(*)::BIGINT,
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ), 2),
    COALESCE(SUM(impressions), 0),
    COALESCE(SUM(engagements), 0),
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ) * (COUNT(*)::NUMERIC / 10), 2)
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(platforms))
    AND published_at > NOW() - INTERVAL '90 days'
  GROUP BY 
    COALESCE(platforms[1], 'all'),
    CASE
      WHEN LENGTH(content) < 100 THEN 'short'
      WHEN LENGTH(content) < 200 THEN 'medium'
      ELSE 'long'
    END;
  
  -- Analyze question patterns
  INSERT INTO content_performance_patterns (
    user_id, platform, pattern_type, pattern_value, post_count, 
    avg_engagement_rate, total_impressions, total_engagement, performance_score
  )
  SELECT
    p_user_id,
    COALESCE(platforms[1], 'all'),
    'has_question',
    CASE WHEN content ~ '\?' THEN 'yes' ELSE 'no' END,
    COUNT(*)::BIGINT,
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ), 2),
    COALESCE(SUM(impressions), 0),
    COALESCE(SUM(engagements), 0),
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ) * (COUNT(*)::NUMERIC / 10), 2)
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(platforms))
    AND published_at > NOW() - INTERVAL '90 days'
  GROUP BY 
    COALESCE(platforms[1], 'all'),
    CASE WHEN content ~ '\?' THEN 'yes' ELSE 'no' END;
  
  -- Analyze posting time patterns
  INSERT INTO content_performance_patterns (
    user_id, platform, pattern_type, pattern_value, post_count, 
    avg_engagement_rate, total_impressions, total_engagement, performance_score
  )
  SELECT
    p_user_id,
    COALESCE(platforms[1], 'all'),
    'posting_time',
    CASE
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END,
    COUNT(*)::BIGINT,
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ), 2),
    COALESCE(SUM(impressions), 0),
    COALESCE(SUM(engagements), 0),
    ROUND(AVG(
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END
    ) * (COUNT(*)::NUMERIC / 10), 2)
  FROM scheduled_posts
  WHERE user_id = p_user_id
    AND status = 'published'
    AND impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(platforms))
    AND published_at > NOW() - INTERVAL '90 days'
  GROUP BY 
    COALESCE(platforms[1], 'all'),
    CASE
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM published_at) BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END;
  
  -- Return all patterns
  RETURN QUERY
  SELECT 
    cpp.pattern_type,
    cpp.pattern_value,
    cpp.post_count,
    cpp.avg_engagement_rate,
    cpp.performance_score
  FROM content_performance_patterns cpp
  WHERE cpp.user_id = p_user_id
  ORDER BY cpp.performance_score DESC;
END;
$$;

-- Function to get top performing elements (hashtags, etc.)
CREATE OR REPLACE FUNCTION get_top_performing_elements(
  p_user_id UUID,
  p_element_type TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  element TEXT,
  usage_count BIGINT,
  avg_engagement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_element_type = 'hashtags' THEN
    RETURN QUERY
    WITH hashtags_extracted AS (
      SELECT 
        regexp_matches(content, '#\w+', 'g') as hashtag,
        CASE 
          WHEN impressions > 0 
          THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
          ELSE 0
        END as engagement_rate
      FROM scheduled_posts
      WHERE user_id = p_user_id
        AND status = 'published'
        AND impressions IS NOT NULL
        AND published_at > NOW() - INTERVAL '90 days'
    )
    SELECT
      (hashtag[1])::TEXT as element,
      COUNT(*)::BIGINT as usage_count,
      ROUND(AVG(engagement_rate), 2) as avg_engagement
    FROM hashtags_extracted
    GROUP BY hashtag[1]
    HAVING COUNT(*) >= 2
    ORDER BY avg_engagement DESC
    LIMIT p_limit;
  END IF;
END;
$$;