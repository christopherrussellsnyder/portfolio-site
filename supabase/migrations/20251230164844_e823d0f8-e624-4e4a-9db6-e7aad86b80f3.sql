-- Create audience activity patterns table
CREATE TABLE IF NOT EXISTS audience_activity_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  avg_engagement_rate NUMERIC DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, day_of_week, hour_of_day)
);

-- Enable RLS
ALTER TABLE audience_activity_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activity patterns"
ON audience_activity_patterns FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity patterns"
ON audience_activity_patterns FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity patterns"
ON audience_activity_patterns FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity patterns"
ON audience_activity_patterns FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_activity_patterns_user ON audience_activity_patterns(user_id);
CREATE INDEX idx_activity_patterns_platform ON audience_activity_patterns(platform);

-- Function to calculate audience activity from scheduled_posts
CREATE OR REPLACE FUNCTION calculate_audience_activity(p_user_id UUID, p_platform TEXT)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  avg_engagement_rate NUMERIC,
  sample_size INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH post_stats AS (
    SELECT
      EXTRACT(DOW FROM published_at)::INTEGER as dow,
      EXTRACT(HOUR FROM published_at)::INTEGER as hour,
      CASE 
        WHEN impressions > 0 
        THEN (engagements::NUMERIC / impressions::NUMERIC * 100)
        ELSE 0
      END as engagement_rate
    FROM scheduled_posts
    WHERE user_id = p_user_id
      AND status = 'published'
      AND impressions IS NOT NULL
      AND impressions > 0
      AND (p_platform = 'all' OR p_platform = ANY(platforms))
      AND published_at > NOW() - INTERVAL '90 days'
  )
  SELECT
    dow as day_of_week,
    hour as hour_of_day,
    ROUND(AVG(engagement_rate), 2) as avg_engagement_rate,
    COUNT(*)::INTEGER as sample_size
  FROM post_stats
  GROUP BY dow, hour
  HAVING COUNT(*) >= 2
  ORDER BY avg_engagement_rate DESC;
END;
$$;

-- Function to find schedule gaps
CREATE OR REPLACE FUNCTION find_schedule_gaps(p_user_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  gap_start TIMESTAMPTZ,
  gap_end TIMESTAMPTZ,
  gap_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH scheduled_times AS (
    SELECT scheduled_time as scheduled_for
    FROM scheduled_posts
    WHERE user_id = p_user_id
      AND status = 'scheduled'
      AND scheduled_time BETWEEN NOW() AND NOW() + (p_days_ahead || ' days')::INTERVAL
    ORDER BY scheduled_time
  ),
  time_gaps AS (
    SELECT
      scheduled_for as gap_start,
      LEAD(scheduled_for) OVER (ORDER BY scheduled_for) as gap_end
    FROM scheduled_times
  )
  SELECT
    tg.gap_start,
    tg.gap_end,
    EXTRACT(EPOCH FROM (tg.gap_end - tg.gap_start)) / 3600 as gap_hours
  FROM time_gaps tg
  WHERE tg.gap_end IS NOT NULL
    AND EXTRACT(EPOCH FROM (tg.gap_end - tg.gap_start)) / 3600 > 72
  ORDER BY gap_hours DESC;
END;
$$;

-- Function to get optimal time slots
CREATE OR REPLACE FUNCTION get_optimal_time_slots(p_user_id UUID, p_platform TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  avg_engagement_rate NUMERIC,
  confidence TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aap.day_of_week,
    aap.hour_of_day,
    aap.avg_engagement_rate,
    CASE
      WHEN aap.sample_size >= 10 THEN 'high'
      WHEN aap.sample_size >= 5 THEN 'medium'
      ELSE 'low'
    END as confidence
  FROM audience_activity_patterns aap
  WHERE aap.user_id = p_user_id
    AND (p_platform = 'all' OR aap.platform = p_platform)
  ORDER BY aap.avg_engagement_rate DESC
  LIMIT p_limit;
END;
$$;