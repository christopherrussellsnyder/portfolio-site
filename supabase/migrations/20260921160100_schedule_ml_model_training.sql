-- ml-model-training's per-user timing-prediction model had no scheduler
-- either: a user could only get one trained by hitting the (until now,
-- orphaned) predict-engagement-adjacent flows, or the internal call from
-- dynamic-optimization's auto_optimize_schedule action when it decided a
-- retrain was warranted. Neither keeps every eligible user's model current
-- on its own. train_all_users (added alongside this migration) is a
-- cron-only batch action that finds every user with >=10 published posts
-- with tracked impressions and retrains each of their models in turn.
--
-- Weekly, not nightly: retraining is per-user compute work (builds a small
-- gradient-boosted tree ensemble per user), and posting-time patterns don't
-- shift day to day. Offset by an hour from the other Sunday cron job so
-- they don't compete for connections against the same project.
SELECT cron.schedule(
  'ml-model-training-weekly',
  '10 4 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://vfwwhhkrquhbohlzazwo.supabase.co/functions/v1/ml-model-training',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{"action": "train_all_users"}'::jsonb
  );
  $$
);
