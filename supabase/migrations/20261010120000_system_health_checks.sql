-- Proactive reliability monitoring. The video-ads outage earlier (a dead
-- `export` crashing _shared/video-quota.ts at module boot, taking down
-- list-ad-actors/generate-video-ad/video-ad-status silently) went
-- undetected until a user noticed broken UI -- nothing checked, nothing
-- alerted. This table is the log system-health-check writes to on every
-- run, so there is a queryable history of whether the revenue-critical
-- functions, Anthropic, Stripe, HeyGen and the email pipeline were actually
-- working, not just "did anyone happen to look."

CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_ok BOOLEAN NOT NULL,
  results JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at
  ON public.system_health_checks(checked_at DESC);

ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

-- Admin/owner only -- this surfaces provider key status and internal
-- infrastructure detail that has no reason to be visible to regular users.
CREATE POLICY "Admins can view system health checks"
  ON public.system_health_checks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Only the edge function (service role) writes this table.
GRANT SELECT ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_health_checks TO service_role;

-- Trim history so this never grows unbounded -- 30 days at a 15-minute
-- cadence is ~2,880 rows, which is already more than anyone needs to page
-- through; keep a rolling 30-day window.
CREATE OR REPLACE FUNCTION public.prune_system_health_checks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.system_health_checks WHERE checked_at < now() - interval '30 days';
$$;

-- Every 15 minutes: cheap enough to catch an outage within minutes (the
-- function itself costs effectively nothing -- OPTIONS pings, one 4-token
-- Anthropic call, a free Stripe balance read, and plain table reads for
-- HeyGen/email) without being wasteful.
SELECT cron.schedule(
  'system-health-check-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/system-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Daily at 03:10, offset from the other scheduled jobs: prune old rows.
SELECT cron.schedule(
  'system-health-checks-prune-daily',
  '10 3 * * *',
  $$ SELECT public.prune_system_health_checks(); $$
);
