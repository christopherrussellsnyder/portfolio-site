-- Competitor monitoring/alerts. Builds on the `competitors` table (already
-- existed, was CRUD'd by the now-deleted competitor-analysis function and
-- has had zero readers/writers since) and the proven Meta Ad Library scraper
-- already used for grounding (scrapeAdLibraryTerm, extracted from
-- fetchCompetitorAds in strategy-intel.ts). Deliberately NOT built on the
-- pre-existing `competitor_benchmarks` table -- that table's schema
-- (avg_engagement_rate, strengths, weaknesses, etc.) was populated by the
-- same deleted function's Math.random() fake-data path and was never real.

CREATE TABLE IF NOT EXISTS public.competitor_ad_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  snippets JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor
  ON public.competitor_ad_snapshots(competitor_id, checked_at DESC);

ALTER TABLE public.competitor_ad_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitor snapshots"
  ON public.competitor_ad_snapshots FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.competitor_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  snippet TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_competitor_alerts_user
  ON public.competitor_alerts(user_id, detected_at DESC);

ALTER TABLE public.competitor_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own competitor alerts"
  ON public.competitor_alerts FOR SELECT USING (auth.uid() = user_id);

-- Reads/writes go through the competitor-monitoring edge function (service
-- role, bypasses RLS), same convention as ab-testing/dynamic-optimization/
-- automation -- these SELECT policies exist for defense-in-depth and any
-- direct client read, not as the primary access path. No client-side
-- INSERT/UPDATE/DELETE policies: only the edge function and its cron job
-- write these tables.
