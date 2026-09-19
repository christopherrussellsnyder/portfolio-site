
CREATE TABLE public.research_personalizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content_mode TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'general',
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, content_mode, industry)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_personalizations TO authenticated;
GRANT ALL ON public.research_personalizations TO service_role;

ALTER TABLE public.research_personalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research personalizations"
  ON public.research_personalizations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_research_personalizations_lookup
  ON public.research_personalizations (user_id, platform, content_mode, industry);
