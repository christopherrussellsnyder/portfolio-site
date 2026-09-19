
-- 1. Campaign intelligence signals (per platform x niche)
CREATE TABLE public.campaign_intelligence_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  niche text NOT NULL,
  recommended_structure text NOT NULL,
  confidence_score numeric DEFAULT 0,
  rationale text,
  roas_trend text,
  profit_margin_trend text,
  budget_split jsonb DEFAULT '{}'::jsonb,
  audience_approach text,
  creative_volume text,
  alternative_to_test text,
  sources jsonb DEFAULT '[]'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, niche)
);

GRANT SELECT ON public.campaign_intelligence_signals TO authenticated;
GRANT ALL ON public.campaign_intelligence_signals TO service_role;

ALTER TABLE public.campaign_intelligence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read campaign intelligence"
  ON public.campaign_intelligence_signals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_campaign_intel_platform_niche
  ON public.campaign_intelligence_signals(platform, niche);
CREATE INDEX idx_campaign_intel_refreshed_at
  ON public.campaign_intelligence_signals(refreshed_at DESC);

-- 2. Support conversations
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own support conversations"
  ON public.support_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own support conversations"
  ON public.support_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own support conversations"
  ON public.support_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own support conversations"
  ON public.support_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_support_conversations_user
  ON public.support_conversations(user_id, created_at DESC);

CREATE TRIGGER trg_support_conversations_updated_at
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add recommended_campaign_structure to content_strategies
ALTER TABLE public.content_strategies
  ADD COLUMN IF NOT EXISTS recommended_campaign_structure jsonb;
