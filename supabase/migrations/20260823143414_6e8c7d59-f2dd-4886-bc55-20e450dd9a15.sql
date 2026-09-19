-- =====================================================================
-- Connected ad accounts (OAuth tokens, encrypted, server-side only)
-- =====================================================================
CREATE TABLE public.connected_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid,
  platform text NOT NULL DEFAULT 'meta',
  account_id text NOT NULL,
  account_name text,
  currency text,
  timezone_name text,
  -- Encrypted at rest (AES-GCM, key held only in edge-function secrets).
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[],
  status text NOT NULL DEFAULT 'active',
  last_error text,
  last_synced_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connected_ad_accounts_status_chk
    CHECK (status IN ('active','expired','revoked','error')),
  CONSTRAINT connected_ad_accounts_platform_chk
    CHECK (platform IN ('meta','google','tiktok','linkedin')),
  CONSTRAINT connected_ad_accounts_unique UNIQUE (user_id, platform, account_id)
);

CREATE INDEX idx_connected_ad_accounts_user ON public.connected_ad_accounts(user_id, platform);
CREATE INDEX idx_connected_ad_accounts_status ON public.connected_ad_accounts(status, last_synced_at);

-- Column-level grants: the browser can never read the encrypted token columns.
GRANT SELECT (id, user_id, workspace_id, platform, account_id, account_name, currency,
              timezone_name, token_expires_at, scopes, status, last_error,
              last_synced_at, connected_at, created_at, updated_at)
  ON public.connected_ad_accounts TO authenticated;
GRANT DELETE ON public.connected_ad_accounts TO authenticated;
GRANT UPDATE (status, updated_at) ON public.connected_ad_accounts TO authenticated;
GRANT ALL ON public.connected_ad_accounts TO service_role;

ALTER TABLE public.connected_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected ad accounts"
  ON public.connected_ad_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected ad accounts"
  ON public.connected_ad_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected ad accounts"
  ON public.connected_ad_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER connected_ad_accounts_updated_at
  BEFORE UPDATE ON public.connected_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Real ad performance pulled from platform APIs
-- =====================================================================
CREATE TABLE public.ad_performance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connected_account_id uuid NOT NULL REFERENCES public.connected_ad_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL DEFAULT 'meta',
  account_id text NOT NULL,
  level text NOT NULL DEFAULT 'campaign',
  object_id text NOT NULL,
  object_name text,
  objective text,
  status text,
  date_start date,
  date_stop date,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  reach bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  frequency numeric,
  purchases numeric,
  purchase_value numeric,
  roas numeric,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_source_type public.data_source_type NOT NULL DEFAULT 'real_api',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_performance_level_chk CHECK (level IN ('account','campaign','adset','ad')),
  CONSTRAINT ad_performance_unique UNIQUE (connected_account_id, level, object_id, date_start, date_stop)
);

CREATE INDEX idx_ad_perf_user ON public.ad_performance_snapshots(user_id, platform, fetched_at DESC);
CREATE INDEX idx_ad_perf_account ON public.ad_performance_snapshots(connected_account_id, level);

GRANT SELECT ON public.ad_performance_snapshots TO authenticated;
GRANT ALL ON public.ad_performance_snapshots TO service_role;

ALTER TABLE public.ad_performance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ad performance"
  ON public.ad_performance_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER ad_performance_snapshots_updated_at
  BEFORE UPDATE ON public.ad_performance_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Short-lived OAuth state (CSRF protection for the Meta redirect)
-- =====================================================================
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'meta',
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge functions) may touch this table.
