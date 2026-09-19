CREATE TABLE public.video_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workspace_id UUID,
  strategy_post_id UUID,
  title TEXT,
  hook TEXT,
  script TEXT NOT NULL,
  angle TEXT,
  provider TEXT NOT NULL DEFAULT 'heygen',
  avatar_id TEXT NOT NULL,
  avatar_name TEXT,
  avatar_preview_url TEXT,
  voice_id TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  status TEXT NOT NULL DEFAULT 'queued',
  provider_video_id TEXT,
  storage_path TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  error_message TEXT,
  counts_against_quota BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_ads TO authenticated;
GRANT ALL ON public.video_ads TO service_role;

ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video ads"
  ON public.video_ads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video ads"
  ON public.video_ads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video ads"
  ON public.video_ads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video ads"
  ON public.video_ads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_ads_user_created ON public.video_ads (user_id, created_at DESC);
CREATE INDEX idx_video_ads_workspace ON public.video_ads (workspace_id, created_at DESC);
CREATE INDEX idx_video_ads_status ON public.video_ads (status) WHERE status IN ('queued', 'processing');

CREATE TRIGGER update_video_ads_updated_at
  BEFORE UPDATE ON public.video_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.video_ad_avatars_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'heygen',
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_ad_avatars_cache TO authenticated;
GRANT ALL ON public.video_ad_avatars_cache TO service_role;

ALTER TABLE public.video_ad_avatars_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read the avatar catalog"
  ON public.video_ad_avatars_cache FOR SELECT TO authenticated
  USING (true);

CREATE UNIQUE INDEX idx_video_ad_avatars_cache_provider ON public.video_ad_avatars_cache (provider);