-- Create optimization_rules table
CREATE TABLE IF NOT EXISTS optimization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('performance', 'budget', 'timing', 'content')),
  condition JSONB NOT NULL,
  action JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  trigger_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_optimization_rules_user ON optimization_rules(user_id);
CREATE INDEX idx_optimization_rules_active ON optimization_rules(is_active);
CREATE INDEX idx_optimization_rules_type ON optimization_rules(rule_type);

-- Enable RLS
ALTER TABLE optimization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own optimization rules"
  ON optimization_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization rules"
  ON optimization_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization rules"
  ON optimization_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own optimization rules"
  ON optimization_rules FOR DELETE
  USING (auth.uid() = user_id);

-- Create optimization_actions table
CREATE TABLE IF NOT EXISTS optimization_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_id UUID REFERENCES optimization_rules(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  triggered_by TEXT,
  action_data JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')) DEFAULT 'pending',
  result JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_optimization_actions_user ON optimization_actions(user_id);
CREATE INDEX idx_optimization_actions_rule ON optimization_actions(rule_id);
CREATE INDEX idx_optimization_actions_status ON optimization_actions(status);

-- Enable RLS
ALTER TABLE optimization_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own optimization actions"
  ON optimization_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimization actions"
  ON optimization_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimization actions"
  ON optimization_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own optimization actions"
  ON optimization_actions FOR DELETE
  USING (auth.uid() = user_id);

-- Create performance_monitoring table
CREATE TABLE IF NOT EXISTS performance_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  baseline_value NUMERIC,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  status TEXT CHECK (status IN ('normal', 'warning', 'critical')) DEFAULT 'normal',
  alert_sent BOOLEAN DEFAULT false,
  monitored_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_monitoring_user ON performance_monitoring(user_id);
CREATE INDEX idx_monitoring_metric ON performance_monitoring(metric_name);
CREATE INDEX idx_monitoring_status ON performance_monitoring(status);

-- Enable RLS
ALTER TABLE performance_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance monitoring"
  ON performance_monitoring FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance monitoring"
  ON performance_monitoring FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance monitoring"
  ON performance_monitoring FOR DELETE
  USING (auth.uid() = user_id);

-- Create auto_ab_tests table
CREATE TABLE IF NOT EXISTS auto_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  created_by_system BOOLEAN DEFAULT true,
  trigger_reason TEXT,
  auto_pause_enabled BOOLEAN DEFAULT true,
  auto_winner_select BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_auto_tests_test ON auto_ab_tests(ab_test_id);
CREATE INDEX idx_auto_tests_status ON auto_ab_tests(status);

-- Enable RLS
ALTER TABLE auto_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their auto ab tests"
  ON auto_ab_tests FOR SELECT
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their auto ab tests"
  ON auto_ab_tests FOR INSERT
  WITH CHECK (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their auto ab tests"
  ON auto_ab_tests FOR UPDATE
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

-- Create evaluate_condition function
CREATE OR REPLACE FUNCTION evaluate_condition(
  p_condition JSONB,
  p_value NUMERIC,
  p_hours NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator TEXT;
  v_threshold NUMERIC;
  v_hours_threshold NUMERIC;
BEGIN
  v_operator := p_condition->>'operator';
  v_threshold := (p_condition->>'value')::NUMERIC;
  v_hours_threshold := (p_condition->>'hours_since_published')::NUMERIC;
  
  IF v_hours_threshold IS NOT NULL AND p_hours < v_hours_threshold THEN
    RETURN false;
  END IF;
  
  CASE v_operator
    WHEN 'greater_than' THEN RETURN p_value > v_threshold;
    WHEN 'less_than' THEN RETURN p_value < v_threshold;
    WHEN 'equals' THEN RETURN p_value = v_threshold;
    WHEN 'greater_than_or_equal' THEN RETURN p_value >= v_threshold;
    WHEN 'less_than_or_equal' THEN RETURN p_value <= v_threshold;
    ELSE RETURN false;
  END CASE;
END;
$$;

-- Create execute_optimization_actions function
CREATE OR REPLACE FUNCTION execute_optimization_actions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action RECORD;
  v_executed_count INTEGER := 0;
BEGIN
  FOR v_action IN 
    SELECT * FROM optimization_actions 
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 10
  LOOP
    BEGIN
      CASE v_action.action_type
        WHEN 'pause_post' THEN
          UPDATE scheduled_posts
          SET status = 'paused'
          WHERE id = (v_action.action_data->>'post_id')::UUID;
          
        ELSE
          NULL;
      END CASE;
      
      UPDATE optimization_actions
      SET 
        status = 'executed',
        executed_at = NOW(),
        result = jsonb_build_object('success', true)
      WHERE id = v_action.id;
      
      UPDATE optimization_rules
      SET success_count = success_count + 1
      WHERE id = v_action.rule_id;
      
      v_executed_count := v_executed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      UPDATE optimization_actions
      SET 
        status = 'failed',
        result = jsonb_build_object('error', SQLERRM)
      WHERE id = v_action.id;
    END;
  END LOOP;
  
  RETURN v_executed_count;
END;
$$;