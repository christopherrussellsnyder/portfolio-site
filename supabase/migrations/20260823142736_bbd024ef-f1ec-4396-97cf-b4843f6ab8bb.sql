DO $$ BEGIN
  CREATE TYPE public.data_source_type AS ENUM ('real_api','first_party','ai_estimated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.campaign_intelligence_signals
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.research_insights
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.research_personalizations
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.industry_benchmarks
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.platform_niche_benchmarks
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.content_trends
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.trending_topics
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'ai_estimated';

ALTER TABLE public.content_performance_patterns
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'first_party';

ALTER TABLE public.audience_activity_patterns
  ADD COLUMN IF NOT EXISTS data_source_type public.data_source_type NOT NULL DEFAULT 'first_party';

UPDATE public.campaign_intelligence_signals SET data_source_type = 'ai_estimated';
UPDATE public.research_insights SET data_source_type = 'ai_estimated';
UPDATE public.content_performance_patterns SET data_source_type = 'first_party';
UPDATE public.audience_activity_patterns SET data_source_type = 'first_party';