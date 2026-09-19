
-- Create user_business_settings table
CREATE TABLE public.user_business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT,
  industry TEXT,
  business_type TEXT DEFAULT 'B2C',
  target_audience JSONB DEFAULT '{}',
  brand_voice TEXT,
  products_services JSONB DEFAULT '[]',
  geographic_focus TEXT,
  price_range TEXT,
  marketing_goals JSONB DEFAULT '[]',
  preferred_platforms JSONB DEFAULT '[]',
  posting_frequency TEXT,
  content_preferences JSONB DEFAULT '{"educational": true, "promotional": true, "behind_scenes": false}',
  competitors JSONB DEFAULT '[]',
  unique_value_proposition TEXT,
  additional_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_business_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can view own business settings"
  ON public.user_business_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business settings"
  ON public.user_business_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business settings"
  ON public.user_business_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business settings"
  ON public.user_business_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_user_business_settings_updated_at
  BEFORE UPDATE ON public.user_business_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
