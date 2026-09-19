-- AI Usage Logs table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_length INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost DECIMAL(10,6),
  response_length INTEGER,
  response_time_ms INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  feature TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_usage_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_request_type ON public.ai_usage_logs(request_type);

-- AI User Quotas table
CREATE TABLE IF NOT EXISTS public.ai_user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_request_limit INTEGER DEFAULT 100,
  monthly_token_limit INTEGER DEFAULT 50000,
  current_month_requests INTEGER DEFAULT 0,
  current_month_tokens INTEGER DEFAULT 0,
  current_month_cost DECIMAL(10,2) DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  plan_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_user_quotas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own quota"
  ON public.ai_user_quotas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quota"
  ON public.ai_user_quotas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quota"
  ON public.ai_user_quotas FOR UPDATE
  USING (auth.uid() = user_id);

-- RPC function to increment AI usage atomically
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_requests INTEGER,
  p_tokens INTEGER,
  p_cost DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_user_quotas (user_id, current_month_requests, current_month_tokens, current_month_cost)
  VALUES (p_user_id, p_requests, p_tokens, p_cost)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    current_month_requests = ai_user_quotas.current_month_requests + p_requests,
    current_month_tokens = ai_user_quotas.current_month_tokens + p_tokens,
    current_month_cost = ai_user_quotas.current_month_cost + p_cost,
    updated_at = now();
END;
$$;