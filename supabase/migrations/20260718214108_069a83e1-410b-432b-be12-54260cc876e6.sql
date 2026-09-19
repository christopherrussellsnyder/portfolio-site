
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('manager','viewer')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invitations TO authenticated;
GRANT ALL ON public.workspace_invitations TO service_role;

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON public.workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON public.workspace_invitations(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_active
  ON public.workspace_invitations(workspace_id, lower(email))
  WHERE status = 'pending';

CREATE POLICY "Owners view invitations" ON public.workspace_invitations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Owners insert invitations" ON public.workspace_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Owners update invitations" ON public.workspace_invitations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "Owners delete invitations" ON public.workspace_invitations
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.workspace_seat_count(_workspace_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = _workspace_id)::int
    + (SELECT COUNT(*) FROM public.workspace_invitations WHERE workspace_id = _workspace_id AND status = 'pending')::int;
$$;
