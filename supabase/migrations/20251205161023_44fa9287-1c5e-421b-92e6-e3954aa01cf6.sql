-- Fix security definer views by recreating with security_invoker = true
DROP VIEW IF EXISTS public.campaign_analytics_summary;
DROP VIEW IF EXISTS public.daily_performance_summary;

-- Recreate campaign_analytics_summary with security invoker
CREATE VIEW public.campaign_analytics_summary 
WITH (security_invoker = true) AS
SELECT 
  a.campaign_id,
  a.user_id,
  c.name AS campaign_name,
  a.platform,
  SUM(a.impressions) AS total_impressions,
  SUM(a.reach) AS total_reach,
  SUM(a.engagement) AS total_engagement,
  SUM(a.likes) AS total_likes,
  SUM(a.comments) AS total_comments,
  SUM(a.shares) AS total_shares,
  SUM(a.clicks) AS total_clicks,
  AVG(a.engagement_rate) AS avg_engagement_rate,
  AVG(a.click_through_rate) AS avg_ctr,
  MIN(a.metric_date) AS first_metric_date,
  MAX(a.metric_date) AS last_metric_date
FROM public.analytics a
LEFT JOIN public.campaigns c ON a.campaign_id = c.id
WHERE a.campaign_id IS NOT NULL
GROUP BY a.campaign_id, a.user_id, c.name, a.platform;

-- Recreate daily_performance_summary with security invoker
CREATE VIEW public.daily_performance_summary 
WITH (security_invoker = true) AS
SELECT 
  a.user_id,
  a.metric_date,
  SUM(a.impressions) AS total_impressions,
  SUM(a.reach) AS total_reach,
  SUM(a.engagement) AS total_engagement,
  SUM(a.likes) AS total_likes,
  SUM(a.comments) AS total_comments,
  SUM(a.shares) AS total_shares,
  SUM(a.clicks) AS total_clicks,
  AVG(a.engagement_rate) AS avg_engagement_rate,
  AVG(a.click_through_rate) AS avg_ctr,
  COUNT(DISTINCT a.post_id) AS posts_count,
  COUNT(DISTINCT a.campaign_id) AS campaigns_count
FROM public.analytics a
GROUP BY a.user_id, a.metric_date
ORDER BY a.metric_date DESC;