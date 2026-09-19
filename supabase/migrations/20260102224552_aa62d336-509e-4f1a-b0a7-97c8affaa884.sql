-- Create engagement_predictions table
CREATE TABLE IF NOT EXISTS public.engagement_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  platform TEXT NOT NULL,
  predicted_score NUMERIC NOT NULL,
  predicted_engagement_rate NUMERIC,
  predicted_impressions INTEGER,
  score_factors JSONB DEFAULT '{}'::jsonb,
  actual_engagement_rate NUMERIC,
  actual_impressions INTEGER,
  prediction_accuracy NUMERIC,
  post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.engagement_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own predictions"
  ON public.engagement_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own predictions"
  ON public.engagement_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own predictions"
  ON public.engagement_predictions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
  ON public.engagement_predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_predictions_user ON public.engagement_predictions(user_id);
CREATE INDEX idx_predictions_post ON public.engagement_predictions(post_id);
CREATE INDEX idx_predictions_accuracy ON public.engagement_predictions(prediction_accuracy) WHERE prediction_accuracy IS NOT NULL;

-- Create trigger function for accuracy calculation
CREATE OR REPLACE FUNCTION public.calculate_prediction_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_engagement_rate IS NOT NULL AND NEW.predicted_engagement_rate IS NOT NULL AND NEW.predicted_engagement_rate > 0 THEN
    NEW.prediction_accuracy := 100 - ABS(((NEW.actual_engagement_rate - NEW.predicted_engagement_rate) / NEW.predicted_engagement_rate) * 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER update_prediction_accuracy
  BEFORE UPDATE ON public.engagement_predictions
  FOR EACH ROW
  WHEN (NEW.actual_engagement_rate IS DISTINCT FROM OLD.actual_engagement_rate)
  EXECUTE FUNCTION public.calculate_prediction_accuracy();

-- Create function to get user baseline metrics
CREATE OR REPLACE FUNCTION public.get_user_baseline_metrics(p_user_id UUID, p_platform TEXT)
RETURNS TABLE (
  avg_engagement_rate NUMERIC,
  avg_impressions INTEGER,
  total_posts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ROUND(AVG(CASE 
      WHEN sp.impressions > 0 
      THEN (sp.engagements::NUMERIC / sp.impressions::NUMERIC * 100)
      ELSE 0
    END), 2), 2.5) as avg_engagement_rate,
    COALESCE(ROUND(AVG(sp.impressions))::INTEGER, 1000) as avg_impressions,
    COUNT(*)::INTEGER as total_posts
  FROM scheduled_posts sp
  WHERE sp.user_id = p_user_id
    AND sp.status = 'published'
    AND sp.impressions IS NOT NULL
    AND (p_platform = 'all' OR p_platform = ANY(sp.platforms))
    AND sp.published_at > NOW() - INTERVAL '90 days';
END;
$$;