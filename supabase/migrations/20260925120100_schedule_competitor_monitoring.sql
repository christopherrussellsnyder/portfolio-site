-- Weekly sweep of every user's tracked competitors: scrapes current Meta Ad
-- Library results per competitor, diffs against their last snapshot, and
-- writes an alert for each genuinely new ad. Same cron auth pattern as the
-- other scheduled jobs (vault-stored service_role key + Lovable-Context:
-- cron header). Same day as the other Sunday jobs, offset by an hour so
-- they don't compete for connections.
SELECT cron.schedule(
  'competitor-monitoring-weekly',
  '10 5 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/competitor-monitoring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{"action": "check_all_users"}'::jsonb
  );
  $$
);
