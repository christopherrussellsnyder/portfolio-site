-- cron.job_run_details had grown to ~5.1 GB (99% of the database, disk at 69%).
-- Purge it and keep only a 7-day rolling window from here on.
TRUNCATE cron.job_run_details;

SELECT cron.schedule(
  'purge-cron-run-details-daily',
  '30 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);
