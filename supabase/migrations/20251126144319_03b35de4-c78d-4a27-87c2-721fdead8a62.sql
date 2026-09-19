-- Content Library Table
CREATE TABLE IF NOT EXISTS content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('headline', 'ad_copy', 'social_post', 'email', 'cta')),
  objective TEXT CHECK (objective IN ('awareness', 'traffic', 'conversions')),
  platform TEXT,
  prompt TEXT,
  generated_content TEXT NOT NULL,
  tone TEXT,
  length TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT false,
  used_in_campaign BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own content"
  ON content_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own content"
  ON content_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content"
  ON content_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content"
  ON content_library FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_content_library_user_id ON content_library(user_id);
CREATE INDEX idx_content_library_campaign_id ON content_library(campaign_id);
CREATE INDEX idx_content_library_created_at ON content_library(created_at DESC);

-- Add updated_at trigger using existing function
CREATE TRIGGER update_content_library_updated_at
  BEFORE UPDATE ON content_library
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();