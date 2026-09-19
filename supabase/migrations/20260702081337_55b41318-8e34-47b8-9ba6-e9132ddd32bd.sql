
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_body text,
  ADD COLUMN IF NOT EXISTS replied_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS gmail_message_id text,
  ADD COLUMN IF NOT EXISTS gmail_thread_id text;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Owners can view submissions" ON public.contact_submissions;
CREATE POLICY "Owners can view submissions" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Owners can update submissions" ON public.contact_submissions;
CREATE POLICY "Owners can update submissions" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT, UPDATE ON public.contact_submissions TO authenticated;
