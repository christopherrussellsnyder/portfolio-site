-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing AI-generated videos
CREATE TABLE public.ai_generated_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  script TEXT NOT NULL,
  target_audience TEXT,
  video_style TEXT NOT NULL DEFAULT 'professional',
  duration INTEGER NOT NULL DEFAULT 30,
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  avatar_type TEXT DEFAULT 'female_professional',
  background_music TEXT DEFAULT 'none',
  text_overlay_enabled BOOLEAN DEFAULT false,
  video_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  generation_cost NUMERIC(10,4) DEFAULT 0,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.ai_generated_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own videos" 
ON public.ai_generated_videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos" 
ON public.ai_generated_videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.ai_generated_videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
ON public.ai_generated_videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_generated_videos_updated_at
BEFORE UPDATE ON public.ai_generated_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_ai_generated_videos_user_id ON public.ai_generated_videos(user_id);
CREATE INDEX idx_ai_generated_videos_status ON public.ai_generated_videos(status);
CREATE INDEX idx_ai_generated_videos_created_at ON public.ai_generated_videos(created_at DESC);

-- Create storage bucket for AI videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ai-videos', 'ai-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for AI videos
CREATE POLICY "Users can view all AI videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ai-videos');

CREATE POLICY "Users can upload their own AI videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ai-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own AI videos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ai-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own AI videos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ai-videos' AND auth.uid()::text = (storage.foldername(name))[1]);