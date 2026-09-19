-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  post_published_notification BOOLEAN DEFAULT true,
  high_engagement_notification BOOLEAN DEFAULT true,
  campaign_milestone_notification BOOLEAN DEFAULT true,
  weekly_report_notification BOOLEAN DEFAULT true,
  error_notification BOOLEAN DEFAULT true,
  
  -- Display Preferences
  theme TEXT DEFAULT 'dark',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h',
  language TEXT DEFAULT 'en',
  
  -- Content Preferences
  default_post_status TEXT DEFAULT 'scheduled',
  auto_save_drafts BOOLEAN DEFAULT true,
  auto_hashtag_suggestions BOOLEAN DEFAULT true,
  show_best_time_suggestions BOOLEAN DEFAULT true,
  
  -- Privacy
  make_profile_public BOOLEAN DEFAULT false,
  share_analytics BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create brand_settings table
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Brand Identity
  business_name TEXT,
  tagline TEXT,
  bio TEXT,
  website_url TEXT,
  logo_url TEXT,
  
  -- Brand Colors
  primary_color TEXT DEFAULT '#8B5CF6',
  secondary_color TEXT DEFAULT '#3B82F6',
  accent_color TEXT DEFAULT '#10B981',
  
  -- Social Links
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  
  -- Brand Voice
  tone TEXT DEFAULT 'professional',
  key_messages TEXT[],
  brand_hashtags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand settings"
  ON brand_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own brand settings"
  ON brand_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand settings"
  ON brand_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand settings"
  ON brand_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();