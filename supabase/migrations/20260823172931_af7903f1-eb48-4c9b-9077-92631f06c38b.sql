-- 1. outcome_tracking: allow creative (video ad) subjects alongside strategy posts
ALTER TABLE public.outcome_tracking
  ALTER COLUMN strategy_post_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS subject_type text NOT NULL DEFAULT 'strategy_post',
  ADD COLUMN IF NOT EXISTS video_ad_id uuid REFERENCES public.video_ads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS creative_treatment text,
  ADD COLUMN IF NOT EXISTS creative_shot_opening text,
  ADD COLUMN IF NOT EXISTS creative_text_density text,
  ADD COLUMN IF NOT EXISTS creative_duration_bucket text,
  ADD COLUMN IF NOT EXISTS creative_captions boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outcome_tracking_subject_type_check'
  ) THEN
    ALTER TABLE public.outcome_tracking
      ADD CONSTRAINT outcome_tracking_subject_type_check
      CHECK (subject_type IN ('strategy_post','video_ad'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS outcome_tracking_video_ad_id_key
  ON public.outcome_tracking (video_ad_id) WHERE video_ad_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS outcome_tracking_subject_type_idx
  ON public.outcome_tracking (subject_type);

-- 2. ab_test_variants: allow a variant to point at a generated creative
ALTER TABLE public.ab_test_variants
  ADD COLUMN IF NOT EXISTS video_ad_id uuid REFERENCES public.video_ads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creative_signature jsonb;

CREATE INDEX IF NOT EXISTS ab_test_variants_video_ad_id_idx
  ON public.ab_test_variants (video_ad_id);

-- 3. video_ads: link a rendered ad back to its experiment + stored prediction
ALTER TABLE public.video_ads
  ADD COLUMN IF NOT EXISTS ab_test_id uuid REFERENCES public.ab_tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_variant_id uuid REFERENCES public.ab_test_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS predicted_engagement numeric;

CREATE INDEX IF NOT EXISTS video_ads_ab_test_id_idx ON public.video_ads (ab_test_id);