-- A/B Tests table
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  variable_being_tested TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'running', 'completed', 'paused')) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  minimum_sample_size INTEGER DEFAULT 30,
  confidence_level NUMERIC DEFAULT 95,
  winner_variant_id UUID,
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);

-- Enable RLS
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ab_tests"
  ON ab_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ab_tests"
  ON ab_tests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ab_tests"
  ON ab_tests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ab_tests"
  ON ab_tests FOR DELETE
  USING (auth.uid() = user_id);

-- A/B Test Variants table
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  content_template TEXT,
  variable_value JSONB DEFAULT '{}'::jsonb,
  posts_published INTEGER DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  avg_engagement_rate NUMERIC DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ab_variants_test ON ab_test_variants(ab_test_id);
CREATE INDEX idx_ab_variants_control ON ab_test_variants(is_control);

-- Enable RLS
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants of their tests"
  ON ab_test_variants FOR SELECT
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert variants to their tests"
  ON ab_test_variants FOR INSERT
  WITH CHECK (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can update variants of their tests"
  ON ab_test_variants FOR UPDATE
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete variants of their tests"
  ON ab_test_variants FOR DELETE
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

-- A/B Test Results table
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  impressions BIGINT DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ab_results_test ON ab_test_results(ab_test_id);
CREATE INDEX idx_ab_results_variant ON ab_test_results(variant_id);
CREATE INDEX idx_ab_results_post ON ab_test_results(post_id);

-- Enable RLS
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view results of their tests"
  ON ab_test_results FOR SELECT
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert results to their tests"
  ON ab_test_results FOR INSERT
  WITH CHECK (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can update results of their tests"
  ON ab_test_results FOR UPDATE
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete results of their tests"
  ON ab_test_results FOR DELETE
  USING (ab_test_id IN (SELECT id FROM ab_tests WHERE user_id = auth.uid()));

-- Function to calculate A/B test significance
CREATE OR REPLACE FUNCTION calculate_ab_test_significance(p_test_id UUID)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  sample_size INTEGER,
  avg_engagement_rate NUMERIC,
  is_statistically_significant BOOLEAN,
  confidence_level NUMERIC,
  improvement_over_control NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_control_variant RECORD;
  v_variant RECORD;
  v_z_score NUMERIC;
  v_p_value NUMERIC;
BEGIN
  SELECT * INTO v_control_variant
  FROM ab_test_variants
  WHERE ab_test_id = p_test_id
    AND is_control = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  FOR v_variant IN
    SELECT * FROM ab_test_variants WHERE ab_test_id = p_test_id
  LOOP
    IF v_variant.posts_published < 10 THEN
      RETURN QUERY SELECT
        v_variant.id,
        v_variant.variant_name,
        v_variant.posts_published,
        v_variant.avg_engagement_rate,
        false,
        0::NUMERIC,
        0::NUMERIC;
      CONTINUE;
    END IF;
    
    -- Calculate z-score (simplified)
    v_z_score := CASE 
      WHEN v_control_variant.avg_engagement_rate > 0 AND v_variant.posts_published > 0 AND v_control_variant.posts_published > 0
      THEN ABS(
        (v_variant.avg_engagement_rate - v_control_variant.avg_engagement_rate) / 
        GREATEST(SQRT(
          GREATEST((v_variant.avg_engagement_rate * (100 - v_variant.avg_engagement_rate) / v_variant.posts_published), 0.01) +
          GREATEST((v_control_variant.avg_engagement_rate * (100 - v_control_variant.avg_engagement_rate) / v_control_variant.posts_published), 0.01)
        ), 0.01)
      )
      ELSE 0
    END;
    
    v_p_value := CASE
      WHEN v_z_score > 2.576 THEN 99.0
      WHEN v_z_score > 1.96 THEN 95.0
      WHEN v_z_score > 1.645 THEN 90.0
      ELSE 0.0
    END;
    
    RETURN QUERY SELECT
      v_variant.id,
      v_variant.variant_name,
      v_variant.posts_published,
      v_variant.avg_engagement_rate,
      v_p_value >= 95,
      v_p_value,
      CASE 
        WHEN v_control_variant.avg_engagement_rate > 0 
        THEN ROUND(((v_variant.avg_engagement_rate - v_control_variant.avg_engagement_rate) / v_control_variant.avg_engagement_rate * 100), 2)
        ELSE 0
      END;
  END LOOP;
END;
$$;

-- Function to auto-select winner
CREATE OR REPLACE FUNCTION auto_select_ab_winner(p_test_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner RECORD;
BEGIN
  SELECT * INTO v_winner
  FROM calculate_ab_test_significance(p_test_id)
  WHERE is_statistically_significant = true
  ORDER BY avg_engagement_rate DESC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE ab_tests
    SET 
      status = 'completed',
      winner_variant_id = v_winner.variant_id,
      end_date = NOW(),
      results = jsonb_build_object(
        'winner_variant_id', v_winner.variant_id,
        'winner_name', v_winner.variant_name,
        'improvement', v_winner.improvement_over_control,
        'confidence', v_winner.confidence_level,
        'completed_at', NOW()
      )
    WHERE id = p_test_id;
  END IF;
END;
$$;