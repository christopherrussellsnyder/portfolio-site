CREATE TABLE IF NOT EXISTS public.strategy_intel_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (source, cache_key)
);

GRANT ALL ON public.strategy_intel_cache TO service_role;

ALTER TABLE public.strategy_intel_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_strategy_intel_cache_expiry ON public.strategy_intel_cache (expires_at);