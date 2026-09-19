-- Client reports (created first so brand_kits policy can reference it)
CREATE TABLE public.client_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  strategy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX client_reports_workspace_idx ON public.client_reports(workspace_id);
CREATE INDEX client_reports_share_token_idx ON public.client_reports(share_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_reports TO authenticated;
GRANT SELECT ON public.client_reports TO anon;
GRANT ALL ON public.client_reports TO service_role;

ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage reports"
  ON public.client_reports FOR ALL
  TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id))
  WITH CHECK (public.has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Anon reads public reports"
  ON public.client_reports FOR SELECT
  TO anon
  USING (
    is_public = true
    AND share_token IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE TRIGGER client_reports_updated_at
  BEFORE UPDATE ON public.client_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brand kits (one per workspace)
CREATE TABLE public.brand_kits (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#CC0000',
  accent_color text NOT NULL DEFAULT '#0F1013',
  company_name text,
  tagline text,
  contact_email text,
  contact_website text,
  footer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT SELECT ON public.brand_kits TO anon;
GRANT ALL ON public.brand_kits TO service_role;

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage brand kit"
  ON public.brand_kits FOR ALL
  TO authenticated
  USING (public.has_workspace_access(auth.uid(), workspace_id))
  WITH CHECK (public.has_workspace_access(auth.uid(), workspace_id));

CREATE POLICY "Anon reads brand kit for public reports"
  ON public.brand_kits FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM public.client_reports cr
    WHERE cr.workspace_id = brand_kits.workspace_id
      AND cr.is_public = true
      AND cr.share_token IS NOT NULL
      AND (cr.expires_at IS NULL OR cr.expires_at > now())
  ));

CREATE TRIGGER brand_kits_updated_at
  BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: increment view count (public-safe via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_report_view(_share_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.client_reports
  SET view_count = view_count + 1
  WHERE share_token = _share_token
    AND is_public = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.increment_report_view(text) TO anon, authenticated;