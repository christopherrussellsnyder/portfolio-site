-- Create auto_schedule_preferences table
CREATE TABLE IF NOT EXISTS auto_schedule_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  enabled BOOLEAN DEFAULT false,
  
  preferred_platforms TEXT[] DEFAULT ARRAY['all']::TEXT[],
  
  posts_per_day INTEGER DEFAULT 1 CHECK (posts_per_day BETWEEN 1 AND 10),
  posts_per_week INTEGER DEFAULT 7 CHECK (posts_per_week BETWEEN 1 AND 50),
  
  avoid_weekends BOOLEAN DEFAULT false,
  avoid_nights BOOLEAN DEFAULT true,
  
  custom_time_restrictions JSONB DEFAULT '{}'::jsonb,
  
  min_hours_between_posts INTEGER DEFAULT 4,
  
  auto_fill_queue BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE auto_schedule_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own auto_schedule_preferences"
  ON auto_schedule_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auto_schedule_preferences"
  ON auto_schedule_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto_schedule_preferences"
  ON auto_schedule_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own auto_schedule_preferences"
  ON auto_schedule_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_auto_schedule_user ON auto_schedule_preferences(user_id);

-- Function to find next optimal slot
CREATE OR REPLACE FUNCTION find_next_optimal_slot(
  p_user_id UUID,
  p_platform TEXT,
  p_after_time TIMESTAMPTZ DEFAULT NOW(),
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE (
  suggested_time TIMESTAMPTZ,
  expected_engagement NUMERIC,
  reason TEXT,
  confidence TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferences RECORD;
  v_slot RECORD;
  v_candidate_time TIMESTAMPTZ;
  v_day_offset INTEGER;
  v_day_of_week INTEGER;
  v_hour INTEGER;
  v_is_conflict BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM auto_schedule_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    v_preferences.avoid_weekends := false;
    v_preferences.avoid_nights := true;
    v_preferences.min_hours_between_posts := 4;
  END IF;
  
  -- Get optimal slots from audience activity patterns
  FOR v_slot IN 
    SELECT day_of_week, hour_of_day, avg_engagement_rate, sample_size
    FROM audience_activity_patterns
    WHERE user_id = p_user_id
      AND (p_platform = 'all' OR platform = p_platform)
    ORDER BY avg_engagement_rate DESC
    LIMIT 20
  LOOP
    FOR v_day_offset IN 0..p_days_ahead LOOP
      v_candidate_time := date_trunc('day', p_after_time + (v_day_offset || ' days')::INTERVAL) + 
                          (v_slot.hour_of_day || ' hours')::INTERVAL;
      
      v_day_of_week := EXTRACT(DOW FROM v_candidate_time)::INTEGER;
      
      -- Skip if not matching the day of week pattern
      IF v_day_of_week != v_slot.day_of_week THEN
        CONTINUE;
      END IF;
      
      -- Skip if before after_time
      IF v_candidate_time <= p_after_time THEN
        CONTINUE;
      END IF;
      
      -- Check preferences
      IF v_preferences.avoid_weekends AND v_day_of_week IN (0, 6) THEN
        CONTINUE;
      END IF;
      
      v_hour := EXTRACT(HOUR FROM v_candidate_time)::INTEGER;
      IF v_preferences.avoid_nights AND (v_hour < 6 OR v_hour > 22) THEN
        CONTINUE;
      END IF;
      
      -- Check for conflicts with existing posts
      SELECT EXISTS(
        SELECT 1 FROM scheduled_posts
        WHERE user_id = p_user_id
          AND status = 'scheduled'
          AND ABS(EXTRACT(EPOCH FROM (scheduled_time - v_candidate_time))) < 
              COALESCE(v_preferences.min_hours_between_posts, 4) * 3600
      ) INTO v_is_conflict;
      
      IF NOT v_is_conflict THEN
        RETURN QUERY SELECT
          v_candidate_time,
          v_slot.avg_engagement_rate,
          'Optimal time based on your audience activity'::TEXT,
          CASE 
            WHEN v_slot.sample_size >= 10 THEN 'high'
            WHEN v_slot.sample_size >= 5 THEN 'medium'
            ELSE 'low'
          END::TEXT;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Fallback: return a default slot
  RETURN QUERY SELECT
    p_after_time + INTERVAL '1 day',
    2.5::NUMERIC,
    'Default time (no optimal slot found)'::TEXT,
    'low'::TEXT;
END;
$$;

-- Function to auto-schedule queued content
CREATE OR REPLACE FUNCTION auto_schedule_queued_content(p_user_id UUID)
RETURNS TABLE (
  content_id UUID,
  scheduled_time TIMESTAMPTZ,
  expected_engagement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content RECORD;
  v_next_slot RECORD;
  v_last_scheduled TIMESTAMPTZ := NOW();
BEGIN
  FOR v_content IN 
    SELECT * FROM scheduled_posts
    WHERE user_id = p_user_id
      AND status = 'draft'
      AND scheduled_time IS NULL
    ORDER BY created_at
    LIMIT 20
  LOOP
    SELECT * INTO v_next_slot
    FROM find_next_optimal_slot(p_user_id, v_content.platforms[1], v_last_scheduled);
    
    UPDATE scheduled_posts
    SET 
      scheduled_time = v_next_slot.suggested_time,
      status = 'scheduled'
    WHERE id = v_content.id;
    
    v_last_scheduled := v_next_slot.suggested_time;
    
    RETURN QUERY SELECT
      v_content.id,
      v_next_slot.suggested_time,
      v_next_slot.expected_engagement;
  END LOOP;
END;
$$;