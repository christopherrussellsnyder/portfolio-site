-- Create campaign_strategy_requests table for storing questionnaire data
CREATE TABLE public.campaign_strategy_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Step 1: Campaign Objective
  primary_goal TEXT NOT NULL,
  secondary_goals JSONB DEFAULT '[]'::jsonb,
  
  -- Step 2: Platform & Timing
  primary_platform TEXT NOT NULL,
  additional_platforms JSONB DEFAULT '[]'::jsonb,
  duration_days INTEGER NOT NULL DEFAULT 30,
  start_date DATE NOT NULL,
  
  -- Step 3: Campaign Targets
  target_impressions INTEGER,
  target_engagement_rate NUMERIC,
  target_conversions INTEGER,
  target_followers INTEGER,
  budget_range TEXT,
  urgency_level TEXT NOT NULL DEFAULT 'standard',
  
  -- Step 4: Campaign Details
  campaign_themes JSONB DEFAULT '[]'::jsonb,
  seasonal_type TEXT,
  seasonal_details TEXT,
  special_requirements TEXT,
  campaign_differentiation TEXT,
  
  -- Status and linking
  status TEXT NOT NULL DEFAULT 'pending',
  generated_strategy_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaign_strategy_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own strategy requests"
  ON public.campaign_strategy_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own strategy requests"
  ON public.campaign_strategy_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategy requests"
  ON public.campaign_strategy_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategy requests"
  ON public.campaign_strategy_requests FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for fast user lookups
CREATE INDEX idx_campaign_strategy_requests_user_id ON public.campaign_strategy_requests(user_id);
CREATE INDEX idx_campaign_strategy_requests_status ON public.campaign_strategy_requests(status);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_campaign_strategy_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaign_strategy_requests_updated_at
  BEFORE UPDATE ON public.campaign_strategy_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_strategy_requests_updated_at();