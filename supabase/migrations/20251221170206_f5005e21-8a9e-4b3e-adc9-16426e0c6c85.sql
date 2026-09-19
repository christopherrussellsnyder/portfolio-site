-- Create twitter_analytics table for tracking tweet performance
CREATE TABLE IF NOT EXISTS public.twitter_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  url_clicks INTEGER DEFAULT 0,
  profile_clicks INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.twitter_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own twitter analytics" 
ON public.twitter_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own twitter analytics" 
ON public.twitter_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own twitter analytics" 
ON public.twitter_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own twitter analytics" 
ON public.twitter_analytics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_user ON public.twitter_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_post ON public.twitter_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_twitter_analytics_tweet ON public.twitter_analytics(tweet_id);