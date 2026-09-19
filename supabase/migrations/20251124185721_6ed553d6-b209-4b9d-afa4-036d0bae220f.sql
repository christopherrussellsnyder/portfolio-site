-- Create campaign_drafts table
CREATE TABLE campaign_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Step 1: Details
  name TEXT,
  objective TEXT CHECK (objective IN ('awareness', 'traffic', 'conversions')),
  start_date DATE,
  end_date DATE,
  
  -- Step 2: Audience
  audience_segment TEXT,
  locations TEXT,
  interests TEXT[],
  estimated_reach_min INTEGER,
  estimated_reach_max INTEGER,
  
  -- Step 3: Content
  platforms TEXT[],
  primary_message TEXT,
  call_to_action TEXT,
  
  -- Step 4: Budget
  total_budget DECIMAL(10,2),
  daily_limit DECIMAL(10,2),
  bid_strategy TEXT,
  
  -- Step 5: Tracking
  current_step INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for campaign_drafts
ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign_drafts
CREATE POLICY "Users can view own drafts"
  ON campaign_drafts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON campaign_drafts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON campaign_drafts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts"
  ON campaign_drafts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on campaign_drafts
CREATE TRIGGER update_campaign_drafts_updated_at
  BEFORE UPDATE ON campaign_drafts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create campaign_templates table
CREATE TABLE campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  objective TEXT NOT NULL,
  description TEXT,
  default_platforms TEXT[],
  default_message TEXT,
  icon TEXT,
  popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for campaign_templates (public read-only)
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
  ON campaign_templates FOR SELECT
  TO authenticated
  USING (true);

-- Insert 6 default templates
INSERT INTO campaign_templates 
  (name, category, objective, description, default_platforms, default_message, icon, popular) 
VALUES
  (
    'Product Launch', 
    'sales', 
    'conversions', 
    'Launch a new product with maximum impact', 
    ARRAY['facebook', 'instagram', 'email'], 
    'Introducing our latest innovation! Be the first to experience [Product Name].', 
    '🚀', 
    true
  ),
  (
    'Brand Awareness', 
    'awareness', 
    'awareness', 
    'Increase brand visibility and reach', 
    ARRAY['facebook', 'instagram', 'google'], 
    'Discover what makes us different. Join thousands of satisfied customers.', 
    '✨', 
    true
  ),
  (
    'Holiday Sale', 
    'sales', 
    'conversions', 
    'Seasonal promotion to drive sales', 
    ARRAY['facebook', 'instagram', 'email'], 
    'Limited time offer! Save big this holiday season.', 
    '🎁', 
    true
  ),
  (
    'Lead Generation', 
    'leads', 
    'traffic', 
    'Capture quality leads for your business', 
    ARRAY['google', 'facebook'], 
    'Get your free guide and unlock expert insights today.', 
    '📊', 
    false
  ),
  (
    'Event Promotion', 
    'events', 
    'awareness', 
    'Drive attendance to your event', 
    ARRAY['facebook', 'instagram'], 
    'Join us for an unforgettable experience! Register now.', 
    '🎉', 
    false
  ),
  (
    'Customer Re-engagement', 
    'retention', 
    'conversions', 
    'Win back inactive customers', 
    ARRAY['email'], 
    'We miss you! Here''s an exclusive offer just for you.', 
    '💝', 
    false
  );

-- Extend campaigns table with new columns
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS estimated_reach INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_conversions INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_roi TEXT;