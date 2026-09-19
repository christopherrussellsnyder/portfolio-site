-- Social Media Connections Table
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Platform Info
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  platform_user_id TEXT NOT NULL,
  platform_username TEXT,
  
  -- Authentication
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Account Info
  account_name TEXT,
  account_type TEXT,
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, platform, platform_user_id)
);

-- Enable RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connections"
  ON social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connections"
  ON social_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connections"
  ON social_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections"
  ON social_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_social_connections_user_id ON social_connections(user_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);
CREATE INDEX idx_social_connections_is_active ON social_connections(is_active);

-- Updated_at trigger
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();