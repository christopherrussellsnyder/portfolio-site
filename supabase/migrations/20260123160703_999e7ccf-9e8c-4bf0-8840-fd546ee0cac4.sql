-- Create comprehensive business_information table with all 35+ fields
CREATE TABLE public.business_information (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Section 1: Company Details (existing + new)
  business_name TEXT,
  business_type TEXT,
  industry TEXT,
  company_size TEXT,
  website TEXT,
  location TEXT,
  business_stage TEXT, -- Startup, Growth, Established, Mature
  years_in_business INTEGER,
  monthly_revenue_range TEXT,
  primary_products_services TEXT,
  unique_value_proposition TEXT,
  top_competitors JSONB DEFAULT '[]'::jsonb, -- Array of competitor names
  competitive_advantage TEXT,
  
  -- Section 2: Target Audience
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  gender_distribution JSONB DEFAULT '{"male": 33, "female": 33, "other": 34}'::jsonb,
  income_level TEXT,
  education_levels JSONB DEFAULT '[]'::jsonb, -- Array of selected levels
  geographic_focus JSONB DEFAULT '[]'::jsonb, -- Array of locations
  customer_pain_points TEXT,
  buying_behavior TEXT,
  customer_lifetime_value NUMERIC,
  
  -- Section 3: Brand Identity
  brand_voice_traits JSONB DEFAULT '[]'::jsonb, -- Array of selected traits
  tone_formal_casual SMALLINT DEFAULT 3, -- 1-5 scale
  tone_serious_playful SMALLINT DEFAULT 3, -- 1-5 scale
  tone_informative_entertaining SMALLINT DEFAULT 3, -- 1-5 scale
  primary_brand_color TEXT,
  secondary_brand_color TEXT,
  content_themes JSONB DEFAULT '[]'::jsonb, -- Array of theme tags
  content_restrictions TEXT,
  brand_values JSONB DEFAULT '[]'::jsonb, -- Array of selected values
  
  -- Section 4: Marketing Assets
  available_content_types JSONB DEFAULT '[]'::jsonb, -- Array of content types
  professional_photos_count INTEGER DEFAULT 0,
  videos_available_count INTEGER DEFAULT 0,
  testimonials_count INTEGER DEFAULT 0,
  photography_style TEXT,
  video_production_capability TEXT,
  content_creation_frequency TEXT,
  
  -- Section 5: Performance Metrics
  monthly_website_visitors INTEGER,
  total_social_followers INTEGER,
  avg_post_engagement_rate NUMERIC,
  current_conversion_rate NUMERIC,
  customer_acquisition_cost NUMERIC,
  email_subscriber_count INTEGER,
  best_performing_content_types JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_information ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own business information"
  ON public.business_information FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business information"
  ON public.business_information FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business information"
  ON public.business_information FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business information"
  ON public.business_information FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for fast user lookups
CREATE INDEX idx_business_information_user_id ON public.business_information(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_business_information_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_information_updated_at
  BEFORE UPDATE ON public.business_information
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_information_updated_at();