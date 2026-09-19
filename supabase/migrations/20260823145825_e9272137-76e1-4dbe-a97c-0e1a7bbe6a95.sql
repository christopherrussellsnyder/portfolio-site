-- Harden connected_ad_accounts: encrypted token columns must stay server-side only.
-- Column-level SELECT grants already exist for every non-token column, so
-- revoking the table-level SELECT leaves browser reads working for everything
-- except access_token_enc / refresh_token_enc.
REVOKE ALL ON public.connected_ad_accounts FROM anon;
REVOKE SELECT, INSERT ON public.connected_ad_accounts FROM authenticated;
ALTER TABLE public.connected_ad_accounts ENABLE ROW LEVEL SECURITY;

-- oauth_states is edge-function-only (single-use CSRF handshakes).
REVOKE ALL ON public.oauth_states FROM anon, authenticated;
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- ad_performance_snapshots are written by the sync function (service role)
-- and only read by their owner.
REVOKE ALL ON public.ad_performance_snapshots FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ad_performance_snapshots FROM authenticated;
ALTER TABLE public.ad_performance_snapshots ENABLE ROW LEVEL SECURITY;