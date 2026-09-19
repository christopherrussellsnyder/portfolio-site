
-- Create contact_submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to insert
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read
CREATE POLICY "Service role can read submissions"
  ON public.contact_submissions FOR SELECT
  TO service_role
  USING (true);

-- Update the handle_new_user_subscription function to use starter plan instead of trial
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan_type, trial_end)
  VALUES (NEW.id, 'active', NULL, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.usage_tracking (user_id, month_year)
  VALUES (NEW.id, to_char(now(), 'YYYY-MM'))
  ON CONFLICT (user_id, month_year) DO NOTHING;
  
  RETURN NEW;
END;
$$;
