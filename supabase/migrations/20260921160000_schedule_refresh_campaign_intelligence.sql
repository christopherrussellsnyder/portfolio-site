-- campaign_intelligence_signals is actively read by generate-strategy and
-- ad-intel.ts as part of the AI-estimated paid-media signal layer, but
-- nothing has ever kept it fresh: refresh-campaign-intelligence (the
-- function that repopulates it across all platform x niche pairs) had no
-- scheduler wired to it. Same cron auth pattern as the existing
-- calculate-prediction-accuracy-nightly / capture-post-outcomes-nightly
-- jobs: the vault-stored service_role key as the Authorization bearer,
-- plus a Lovable-Context: cron header the function checks for.
--
-- Weekly rather than nightly: these are broad, AI-estimated directional
-- signals (not measured data), so they don't need to churn daily, and
-- refreshing all 56 platform/niche pairs costs 56 LLM calls per run.
SELECT cron.schedule(
  'refresh-campaign-intelligence-weekly',
  '10 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/refresh-campaign-intelligence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
