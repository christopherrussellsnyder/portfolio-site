
-- Track individual content performance and user interactions
CREATE TABLE IF NOT EXISTS content_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_id uuid REFERENCES content_strategies ON DELETE SET NULL,
  post_id uuid REFERENCES strategy_posts ON DELETE SET NULL,
  platform text NOT NULL,
  post_date date,
  actual_metrics jsonb DEFAULT '{}'::jsonb,
  user_interactions jsonb DEFAULT '{}'::jsonb,
  performance_vs_predicted jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Track user content preferences and behavior patterns
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  behavior_data jsonb DEFAULT '{}'::jsonb,
  learning_confidence float DEFAULT 0.0,
  last_analyzed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Track AI prediction accuracy and enable meta-learning
CREATE TABLE IF NOT EXISTS ai_learning_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prediction_type text NOT NULL,
  predicted_value float,
  actual_value float,
  variance float,
  accuracy_score float,
  context_factors jsonb DEFAULT '{}'::jsonb,
  learning_adjustments jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Track content trends and viral patterns
CREATE TABLE IF NOT EXISTS content_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  trend_type text NOT NULL,
  content_category text,
  trend_data jsonb DEFAULT '{}'::jsonb,
  confidence_score float DEFAULT 0.5,
  first_detected timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_trends ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own performance" ON content_performance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own behavior patterns" ON user_behavior_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning metrics" ON ai_learning_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "All users can view trends" ON content_trends FOR SELECT USING (true);
CREATE POLICY "System can manage trends" ON content_trends FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_content_performance_user ON content_performance(user_id, platform);
CREATE INDEX idx_content_performance_strategy ON content_performance(strategy_id);
CREATE INDEX idx_user_behavior_user_platform ON user_behavior_patterns(user_id, platform);
CREATE INDEX idx_ai_learning_user ON ai_learning_metrics(user_id, prediction_type);
CREATE INDEX idx_content_trends_platform ON content_trends(platform, is_active);
CREATE INDEX idx_content_trends_type ON content_trends(trend_type, is_active);

-- Update triggers
CREATE TRIGGER update_content_performance_updated_at
  BEFORE UPDATE ON content_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_behavior_patterns_updated_at
  BEFORE UPDATE ON user_behavior_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
