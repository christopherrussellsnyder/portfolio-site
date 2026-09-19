-- Create enum types for campaigns
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'draft');
CREATE TYPE campaign_trend AS ENUM ('up', 'down', 'neutral');

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  platform TEXT NOT NULL,
  spend DECIMAL(12, 2) NOT NULL DEFAULT 0,
  roi TEXT,
  trend campaign_trend DEFAULT 'neutral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create metrics_daily table
CREATE TABLE public.metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  email_open_rate DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create performance_data table
CREATE TABLE public.performance_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  day_name TEXT NOT NULL,
  engagement INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for metrics_daily
CREATE POLICY "Users can view their own metrics"
  ON public.metrics_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metrics"
  ON public.metrics_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.metrics_daily FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metrics"
  ON public.metrics_daily FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for performance_data
CREATE POLICY "Users can view their own performance data"
  ON public.performance_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own performance data"
  ON public.performance_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance data"
  ON public.performance_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own performance data"
  ON public.performance_data FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for campaigns updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();