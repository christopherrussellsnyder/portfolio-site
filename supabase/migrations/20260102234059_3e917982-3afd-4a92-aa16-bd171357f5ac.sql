-- ML Training Data table
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  is_holiday BOOLEAN DEFAULT false,
  is_weekend BOOLEAN DEFAULT false,
  content_length INTEGER,
  has_media BOOLEAN,
  has_video BOOLEAN,
  has_image BOOLEAN,
  hashtag_count INTEGER,
  has_question BOOLEAN,
  emoji_count INTEGER,
  platform TEXT,
  engagement_rate NUMERIC,
  impressions INTEGER,
  total_engagement INTEGER,
  weather_condition TEXT,
  season TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_user ON ml_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_post ON ml_training_data(post_id);
CREATE INDEX IF NOT EXISTS idx_ml_training_time ON ml_training_data(day_of_week, hour_of_day);

-- Enable RLS
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ml training data"
  ON ml_training_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ml training data"
  ON ml_training_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ml training data"
  ON ml_training_data FOR DELETE
  USING (auth.uid() = user_id);

-- ML Model Versions table
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  training_samples INTEGER,
  accuracy_score NUMERIC,
  mean_absolute_error NUMERIC,
  feature_importance JSONB DEFAULT '{}'::jsonb,
  model_parameters JSONB DEFAULT '{}'::jsonb,
  trained_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ml_models_user ON ml_model_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_active ON ml_model_versions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE ml_model_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ml models"
  ON ml_model_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ml models"
  ON ml_model_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ml models"
  ON ml_model_versions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ml models"
  ON ml_model_versions FOR DELETE
  USING (auth.uid() = user_id);

-- ML Predictions Cache table
CREATE TABLE IF NOT EXISTS ml_predictions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  model_version_id UUID REFERENCES ml_model_versions(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  hour_of_day INTEGER NOT NULL,
  platform TEXT,
  predicted_engagement_rate NUMERIC,
  prediction_confidence NUMERIC,
  feature_values JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, day_of_week, hour_of_day, platform, model_version_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_cache_user ON ml_predictions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_cache_expiry ON ml_predictions_cache(expires_at);

-- Enable RLS
ALTER TABLE ml_predictions_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ml predictions"
  ON ml_predictions_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ml predictions"
  ON ml_predictions_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ml predictions"
  ON ml_predictions_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get ML training dataset
CREATE OR REPLACE FUNCTION get_ml_training_dataset(p_user_id UUID)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  month INTEGER,
  is_weekend BOOLEAN,
  content_length INTEGER,
  has_media BOOLEAN,
  has_video BOOLEAN,
  hashtag_count INTEGER,
  has_question BOOLEAN,
  emoji_count INTEGER,
  engagement_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mlt.day_of_week,
    mlt.hour_of_day,
    mlt.month,
    mlt.is_weekend,
    mlt.content_length,
    mlt.has_media,
    mlt.has_video,
    mlt.hashtag_count,
    mlt.has_question,
    mlt.emoji_count,
    mlt.engagement_rate
  FROM ml_training_data mlt
  WHERE mlt.user_id = p_user_id
    AND mlt.engagement_rate IS NOT NULL
  ORDER BY mlt.created_at DESC;
END;
$$;