ALTER TABLE public.video_ads
  ADD COLUMN IF NOT EXISTS production_plan jsonb,
  ADD COLUMN IF NOT EXISTS treatment text,
  ADD COLUMN IF NOT EXISTS scene_count integer NOT NULL DEFAULT 1;