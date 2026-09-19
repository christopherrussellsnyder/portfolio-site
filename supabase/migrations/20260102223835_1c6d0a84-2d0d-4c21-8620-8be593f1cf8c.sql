-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_user_id UUID,
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_platform TEXT DEFAULT 'all'
)
RETURNS TABLE (
  total_posts BIGINT,
  total_impressions BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate NUMERIC,
  total_likes BIGINT,
  total_shares BIGINT,
  total_comments BIGINT,
  total_clicks BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_posts,
    COALESCE(SUM(sp.impressions), 0)::BIGINT as total_impressions,
    COALESCE(SUM(sp.engagements), 0)::BIGINT as total_engagement,
    CASE 
      WHEN SUM(sp.impressions) > 0 
      THEN ROUND((SUM(sp.engagements)::NUMERIC / SUM(sp.impressions)::NUMERIC * 100), 2)
      ELSE 0
    END as avg_engagement_rate,
    COALESCE(SUM(sp.engagements), 0)::BIGINT as total_likes,
    0::BIGINT as total_shares,
    0::BIGINT as total_comments,
    COALESCE(SUM(sp.clicks), 0)::BIGINT as total_clicks
  FROM scheduled_posts sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'published'
    AND sp.published_at BETWEEN p_date_from AND p_date_to
    AND (p_platform = 'all' OR p_platform = ANY(sp.platforms));
END;
$$;

-- Function to get top posts
CREATE OR REPLACE FUNCTION get_top_posts_analytics(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_platform TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  platform TEXT,
  engagement_total BIGINT,
  engagement_rate NUMERIC,
  published_at TIMESTAMPTZ
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
    sp.platforms[1] as platform,
    COALESCE(sp.engagements, 0)::BIGINT as engagement_total,
    CASE 
      WHEN sp.impressions > 0 
      THEN ROUND((sp.engagements::NUMERIC / sp.impressions::NUMERIC * 100), 2)
      ELSE 0
    END as engagement_rate,
    sp.published_at
  FROM scheduled_posts sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'published'
    AND sp.impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(sp.platforms))
  ORDER BY engagement_rate DESC
  LIMIT p_limit;
END;
$$;

-- Function to analyze content performance by type
CREATE OR REPLACE FUNCTION analyze_content_performance_by_type(
  p_user_id UUID,
  p_platform TEXT DEFAULT 'all'
)
RETURNS TABLE (
  content_type TEXT,
  avg_engagement_rate NUMERIC,
  post_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH post_types AS (
    SELECT
      CASE
        WHEN sp.media_urls IS NULL OR array_length(sp.media_urls, 1) IS NULL THEN 'text'
        WHEN EXISTS (SELECT 1 FROM unnest(sp.media_urls) url WHERE url ~ '\.(mp4|mov|avi|webm)$') THEN 'video'
        WHEN EXISTS (SELECT 1 FROM unnest(sp.media_urls) url WHERE url ~ '\.(jpg|jpeg|png|gif|webp)$') THEN 'image'
        ELSE 'text'
      END as content_type,
      CASE 
        WHEN sp.impressions > 0 
        THEN (sp.engagements::NUMERIC / sp.impressions::NUMERIC * 100)
        ELSE 0
      END as engagement_rate
    FROM scheduled_posts sp
    WHERE sp.user_id = p_user_id
      AND sp.status = 'published'
      AND sp.impressions IS NOT NULL
      AND (p_platform = 'all' OR p_platform = ANY(sp.platforms))
  )
  SELECT
    pt.content_type,
    ROUND(AVG(pt.engagement_rate), 2) as avg_engagement_rate,
    COUNT(*)::BIGINT as post_count
  FROM post_types pt
  GROUP BY pt.content_type
  ORDER BY avg_engagement_rate DESC;
END;
$$;

-- Function to get posting trends over time
CREATE OR REPLACE FUNCTION get_posting_trends(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  post_count BIGINT,
  avg_engagement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(sp.published_at) as date,
    COUNT(*)::BIGINT as post_count,
    ROUND(AVG(sp.engagements::NUMERIC), 2) as avg_engagement
  FROM scheduled_posts sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'published'
    AND sp.published_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(sp.published_at)
  ORDER BY date DESC;
END;
$$;