
-- ============================================================
-- PHASE 1: MULTI-BRAND WORKSPACES
-- ============================================================

-- 1. workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  logo_url text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);

-- 2. workspace_members
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- 3. Security definer helper
CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = _user_id;
$$;

-- 4. RLS policies for workspaces & members
CREATE POLICY "Users view accessible workspaces" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.has_workspace_access(auth.uid(), id));

CREATE POLICY "Users create own workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete workspaces" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Members view own memberships" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()
  ));

CREATE POLICY "Owners manage memberships" ON public.workspace_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

-- updated_at trigger for workspaces
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Add active_workspace_id to user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 6. Backfill: create a default workspace for every existing user
INSERT INTO public.workspaces (owner_id, name, is_default)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'My Workspace'), true
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = auth.users.id);

-- Owner membership rows
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, owner_id, 'owner' FROM public.workspaces
ON CONFLICT DO NOTHING;

-- Set active_workspace_id for every user
UPDATE public.user_profiles up
SET active_workspace_id = w.id
FROM public.workspaces w
WHERE w.owner_id = up.user_id AND w.is_default = true AND up.active_workspace_id IS NULL;

-- 7. Add workspace_id to scoped tables
ALTER TABLE public.business_context ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.business_promotions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.content_library ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.uploaded_analytics ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.content_strategies ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_drafts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 8. Backfill workspace_id from user_id → default workspace
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['business_context','business_promotions','campaigns','content_library','scheduled_posts','uploaded_analytics','content_strategies','campaign_drafts'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'UPDATE public.%I x SET workspace_id = w.id FROM public.workspaces w WHERE w.owner_id = x.user_id AND w.is_default = true AND x.workspace_id IS NULL',
      t
    );
  END LOOP;
END $$;

-- 9. Indexes on workspace_id
CREATE INDEX IF NOT EXISTS idx_business_context_workspace ON public.business_context(workspace_id);
CREATE INDEX IF NOT EXISTS idx_business_promotions_workspace ON public.business_promotions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON public.campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_library_workspace ON public.content_library(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_workspace ON public.scheduled_posts(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_workspace ON public.uploaded_analytics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_strategies_workspace ON public.content_strategies(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_drafts_workspace ON public.campaign_drafts(workspace_id);

-- 10. Update handle_new_user trigger to auto-create workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workspaces (owner_id, name, is_default)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace'), true)
  RETURNING id INTO v_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, NEW.id, 'owner');

  UPDATE public.user_profiles SET active_workspace_id = v_workspace_id WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;
