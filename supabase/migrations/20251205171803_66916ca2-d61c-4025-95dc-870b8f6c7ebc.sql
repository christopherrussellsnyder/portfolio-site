-- Create content_folders table for organizing content
CREATE TABLE public.content_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT '📁',
  parent_folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on content_folders
ALTER TABLE public.content_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_folders
CREATE POLICY "Users can view their own folders"
ON public.content_folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders"
ON public.content_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON public.content_folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON public.content_folders FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_content_folders_updated_at
BEFORE UPDATE ON public.content_folders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add missing columns to content_library table
ALTER TABLE public.content_library
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content_text TEXT,
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.content_folders(id) ON DELETE SET NULL;

-- Create indexes for content_library
CREATE INDEX IF NOT EXISTS idx_content_library_user_id ON public.content_library(user_id);
CREATE INDEX IF NOT EXISTS idx_content_library_platform ON public.content_library(platform);
CREATE INDEX IF NOT EXISTS idx_content_library_category ON public.content_library(category);
CREATE INDEX IF NOT EXISTS idx_content_library_is_favorite ON public.content_library(is_favorite);
CREATE INDEX IF NOT EXISTS idx_content_library_is_template ON public.content_library(is_template);
CREATE INDEX IF NOT EXISTS idx_content_library_folder_id ON public.content_library(folder_id);

-- Create indexes for content_folders
CREATE INDEX idx_content_folders_user_id ON public.content_folders(user_id);
CREATE INDEX idx_content_folders_parent_id ON public.content_folders(parent_folder_id);