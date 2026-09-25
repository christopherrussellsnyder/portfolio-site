-- The capture-post-outcomes-nightly and calculate-prediction-accuracy-nightly
-- cron jobs (registered in 20260823150559) hardcode the URL of a stale
-- project ref (yxpzkcqeqzpgysvrrezc) left over from before this codebase was
-- reconnected to its real project. Since migrations run once, editing that
-- old file does nothing to the cron job already registered in cron.job with
-- the wrong URL baked into its command -- re-register both with the correct
-- project's URL, same schedule and auth pattern as before.
SELECT cron.unschedule('capture-post-outcomes-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'capture-post-outcomes-nightly');
SELECT cron.unschedule('calculate-prediction-accuracy-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calculate-prediction-accuracy-nightly');

SELECT cron.schedule(
  'capture-post-outcomes-nightly',
  '10 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/capture-post-outcomes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'calculate-prediction-accuracy-nightly',
  '40 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/calculate-prediction-accuracy',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
