-- 1. critic score on strategy_posts
ALTER TABLE public.strategy_posts ADD COLUMN IF NOT EXISTS critic_score numeric;

-- 2. outcome_tracking
CREATE TABLE IF NOT EXISTS public.outcome_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_post_id uuid NOT NULL REFERENCES public.strategy_posts(id) ON DELETE CASCADE,
  predicted_engagement numeric,
  predicted_score numeric,
  actual_engagement numeric,
  actual_reach numeric,
  actual_conversions numeric,
  measured_at timestamptz,
  source text NOT NULL DEFAULT 'manual_entry' CHECK (source IN ('meta_api','manual_entry')),
  niche text,
  pattern_hook_technique text,
  pattern_post_type text,
  error_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (strategy_post_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.outcome_tracking TO authenticated;
GRANT ALL ON public.outcome_tracking TO service_role;
ALTER TABLE public.outcome_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own outcomes" ON public.outcome_tracking
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own outcomes" ON public.outcome_tracking
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own outcomes" ON public.outcome_tracking
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own outcomes" ON public.outcome_tracking
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_outcome_tracking_user ON public.outcome_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_outcome_tracking_niche ON public.outcome_tracking(niche);
CREATE INDEX IF NOT EXISTS idx_outcome_tracking_measured ON public.outcome_tracking(measured_at);

CREATE TRIGGER outcome_tracking_updated_at BEFORE UPDATE ON public.outcome_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. niche_calibration
CREATE TABLE IF NOT EXISTS public.niche_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  pattern_type text NOT NULL,
  pattern_value text NOT NULL,
  avg_predicted numeric NOT NULL DEFAULT 0,
  avg_actual numeric NOT NULL DEFAULT 0,
  error_pct numeric NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  is_calibrated boolean NOT NULL DEFAULT false,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (niche, pattern_type, pattern_value)
);

GRANT SELECT ON public.niche_calibration TO authenticated;
GRANT ALL ON public.niche_calibration TO service_role;
ALTER TABLE public.niche_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read calibration" ON public.niche_calibration
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_niche_calibration_lookup ON public.niche_calibration(niche, pattern_type);

-- 4. accuracy trend snapshot (admin dashboard)
CREATE TABLE IF NOT EXISTS public.prediction_accuracy_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  sample_size integer NOT NULL DEFAULT 0,
  avg_abs_error_pct numeric NOT NULL DEFAULT 0,
  avg_predicted numeric NOT NULL DEFAULT 0,
  avg_actual numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prediction_accuracy_daily TO authenticated;
GRANT ALL ON public.prediction_accuracy_daily TO service_role;
ALTER TABLE public.prediction_accuracy_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read accuracy trend" ON public.prediction_accuracy_daily
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));