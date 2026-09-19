
-- Add multi-format and ad platform columns to uploaded_analytics
ALTER TABLE public.uploaded_analytics 
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_format text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS file_size_bytes integer,
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS processing_error text,
  ADD COLUMN IF NOT EXISTS platform_type text,
  ADD COLUMN IF NOT EXISTS ad_platform_specific jsonb,
  ADD COLUMN IF NOT EXISTS extracted_data_quality text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS data_completeness_score float DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS supports_comparison boolean DEFAULT true;

-- Make image_url nullable since non-image files won't have one
ALTER TABLE public.uploaded_analytics ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.uploaded_analytics ALTER COLUMN image_url SET DEFAULT null;

-- Add comment for documentation
COMMENT ON COLUMN public.uploaded_analytics.file_format IS 'Simplified format: image, pdf, excel, csv, json, xml';
COMMENT ON COLUMN public.uploaded_analytics.platform_type IS 'social or advertising';
COMMENT ON COLUMN public.uploaded_analytics.processing_status IS 'pending, processing, completed, failed';
COMMENT ON COLUMN public.uploaded_analytics.extracted_data_quality IS 'high, medium, low';
