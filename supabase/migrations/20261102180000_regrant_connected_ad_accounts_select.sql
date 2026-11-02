-- Fix: the table-level "REVOKE SELECT ... FROM authenticated" in
-- 20260823145825 silently stripped the column-level SELECT grant from
-- 20260823143414 as well (a table-level REVOKE cascades to column-level
-- grants underneath it in Postgres, contrary to that migration's own
-- comment). Net effect since that migration: `authenticated` has had zero
-- SELECT access to connected_ad_accounts at all -- every frontend read has
-- been failing with "permission denied for table connected_ad_accounts"
-- before RLS is even evaluated, regardless of how correctly the RLS policy
-- itself is written. Re-grant the same non-token column list; RLS still
-- scopes every row to its owner.
GRANT SELECT (id, user_id, workspace_id, platform, account_id, account_name, currency,
              timezone_name, token_expires_at, scopes, status, last_error,
              last_synced_at, connected_at, created_at, updated_at)
  ON public.connected_ad_accounts TO authenticated;
