-- The onboarding opt-in prompt (EmailFunnelOptInPrompt.tsx) writes new rows
-- into email_subscribers with next_send_at = now(), expecting the welcome
-- email "shortly" -- but nothing ever called process-email-funnel to send
-- it or advance the drip. Wire it hourly (15 past, offset from the other
-- scheduled jobs) so the funnel actually runs. Same cron auth pattern as
-- the other scheduled jobs (vault-stored service_role key + Lovable-Context:
-- cron header).
SELECT cron.schedule(
  'process-email-funnel-hourly',
  '15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/process-email-funnel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
