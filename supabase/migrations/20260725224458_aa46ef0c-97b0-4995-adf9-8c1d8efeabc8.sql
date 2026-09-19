
CREATE TABLE IF NOT EXISTS public.research_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  content_mode TEXT NOT NULL DEFAULT 'hybrid',
  industry TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_research_insights_lookup 
  ON public.research_insights (platform, content_mode, industry, generated_at DESC);

GRANT SELECT ON public.research_insights TO authenticated;
GRANT ALL ON public.research_insights TO service_role;

ALTER TABLE public.research_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read research insights"
  ON public.research_insights FOR SELECT
  TO authenticated
  USING (true);
