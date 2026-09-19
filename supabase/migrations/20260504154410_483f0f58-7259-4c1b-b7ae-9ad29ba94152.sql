
CREATE TABLE public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text NOT NULL,
  full_name text,
  current_step integer NOT NULL DEFAULT 0,
  next_send_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','completed','paused')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_subscribers_due ON public.email_subscribers(next_send_at) WHERE status = 'active';
CREATE INDEX idx_email_subscribers_user ON public.email_subscribers(user_id);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.email_subscribers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription" ON public.email_subscribers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON public.email_subscribers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_email_subscribers_updated_at
  BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.funnel_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  step integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, step)
);

CREATE INDEX idx_funnel_log_user ON public.funnel_email_log(user_id);

ALTER TABLE public.funnel_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own funnel log" ON public.funnel_email_log
  FOR SELECT USING (auth.uid() = user_id);
