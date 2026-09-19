-- Create audience_insights table for storing targeting recommendations and performance metrics
CREATE TABLE public.audience_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'targeting_recommendation', 'performance_metric', 'learning_data'
  targeting_parameters JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  recommendation_score NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_action NUMERIC DEFAULT 0,
  return_on_ad_spend NUMERIC DEFAULT 0,
  is_top_performer BOOLEAN DEFAULT false,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business_profiles table for storing user business information
CREATE TABLE public.business_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  business_name TEXT,
  industry TEXT,
  niche TEXT,
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  target_genders TEXT[] DEFAULT ARRAY['all']::text[],
  target_locations TEXT[] DEFAULT ARRAY[]::text[],
  target_interests TEXT[] DEFAULT ARRAY[]::text[],
  business_goals TEXT[] DEFAULT ARRAY[]::text[],
  average_order_value NUMERIC DEFAULT 0,
  price_point TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'premium'
  products_services TEXT,
  unique_selling_points TEXT[] DEFAULT ARRAY[]::text[],
  competitor_names TEXT[] DEFAULT ARRAY[]::text[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audience_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audience_insights
CREATE POLICY "Users can view their own audience insights"
  ON public.audience_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audience insights"
  ON public.audience_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audience insights"
  ON public.audience_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audience insights"
  ON public.audience_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for business_profiles
CREATE POLICY "Users can view their own business profile"
  ON public.business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
  ON public.business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business profile"
  ON public.business_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_audience_insights_updated_at
  BEFORE UPDATE ON public.audience_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();