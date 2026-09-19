-- 1) Remove 7-day Stripe trial defaults; default new subs to 'active' Starter (free) tier
ALTER TABLE public.subscriptions ALTER COLUMN trial_end DROP DEFAULT;
ALTER TABLE public.subscriptions ALTER COLUMN status SET DEFAULT 'active';

-- 2) Track lifetime strategy usage (Starter = 2 lifetime cap, not monthly)
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS lifetime_strategies_generated integer NOT NULL DEFAULT 0;

-- Backfill lifetime counter from monthly counters for existing users
UPDATE public.usage_tracking ut
SET lifetime_strategies_generated = sub.total
FROM (
  SELECT user_id, SUM(strategies_generated)::int AS total
  FROM public.usage_tracking
  GROUP BY user_id
) sub
WHERE ut.user_id = sub.user_id
  AND ut.lifetime_strategies_generated < sub.total;

-- 3) Performance indexes for high-traffic lookups (10k+ concurrent target)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON public.usage_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_business_context_user_active ON public.business_context (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cache_entries_type_expires ON public.cache_entries (cache_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON public.user_profiles (user_id);

-- 4) Convenience: atomic increment for lifetime strategy count (used by edge functions)
CREATE OR REPLACE FUNCTION public.increment_strategy_usage(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text := to_char(now(), 'YYYY-MM');
  v_lifetime integer;
BEGIN
  INSERT INTO public.usage_tracking (user_id, month_year, strategies_generated, lifetime_strategies_generated)
  VALUES (p_user_id, v_month, 1, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    strategies_generated = usage_tracking.strategies_generated + 1,
    lifetime_strategies_generated = usage_tracking.lifetime_strategies_generated + 1,
    updated_at = now()
  RETURNING lifetime_strategies_generated INTO v_lifetime;
  RETURN v_lifetime;
END;
$$;