CREATE OR REPLACE FUNCTION public.increment_report_view(_share_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.client_reports
  SET view_count = COALESCE(view_count, 0) + 1,
      last_viewed_at = now()
  WHERE share_token = _share_token
    AND is_public = true
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_report_view(text) TO anon, authenticated;