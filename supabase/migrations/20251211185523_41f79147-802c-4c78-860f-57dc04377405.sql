-- Create media_folders table first (referenced by media_library)
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT,
  parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  item_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on media_folders
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media folders"
  ON media_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media folders"
  ON media_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media folders"
  ON media_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media folders"
  ON media_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Create media_library table
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  tags TEXT[],
  title TEXT,
  description TEXT,
  alt_text TEXT,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  used_in_posts UUID[],
  avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  color_palette JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on media_library
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media"
  ON media_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON media_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON media_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON media_library FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_media_user_id ON media_library(user_id);
CREATE INDEX idx_media_file_type ON media_library(file_type);
CREATE INDEX idx_media_folder ON media_library(folder_id);
CREATE INDEX idx_media_tags ON media_library USING GIN(tags);
CREATE INDEX idx_media_uploaded_at ON media_library(uploaded_at DESC);
CREATE INDEX idx_media_folders_user_id ON media_folders(user_id);

-- Add updated_at triggers
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_media_folders_updated_at
  BEFORE UPDATE ON media_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();