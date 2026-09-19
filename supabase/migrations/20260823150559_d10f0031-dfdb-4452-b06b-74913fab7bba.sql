SELECT cron.unschedule('capture-post-outcomes-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'capture-post-outcomes-nightly');
SELECT cron.unschedule('calculate-prediction-accuracy-nightly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calculate-prediction-accuracy-nightly');

SELECT cron.schedule(
  'capture-post-outcomes-nightly',
  '10 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://yxpzkcqeqzpgysvrrezc.supabase.co/functions/v1/capture-post-outcomes',
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
    url := 'https://yxpzkcqeqzpgysvrrezc.supabase.co/functions/v1/calculate-prediction-accuracy',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);