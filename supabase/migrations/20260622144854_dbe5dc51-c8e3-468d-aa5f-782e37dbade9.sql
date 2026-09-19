CREATE TABLE public.business_promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  promo_type text NOT NULL DEFAULT 'discount',
  offer_details text NOT NULL,
  discount_value text,
  promo_code text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_products text,
  cta_url text,
  priority text NOT NULL DEFAULT 'normal',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_promotions TO authenticated;
GRANT ALL ON public.business_promotions TO service_role;

ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own promotions" ON public.business_promotions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own promotions" ON public.business_promotions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own promotions" ON public.business_promotions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own promotions" ON public.business_promotions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_business_promotions_user_active ON public.business_promotions(user_id, is_active, start_date, end_date);

CREATE TRIGGER update_business_promotions_updated_at
  BEFORE UPDATE ON public.business_promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();