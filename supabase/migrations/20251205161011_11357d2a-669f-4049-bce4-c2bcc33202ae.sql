-- Create posts table for storing published social media posts
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  platform_post_id TEXT,
  
  content TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  hashtags TEXT[],
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  engagement_data JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for posts
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_campaign_id ON public.posts(campaign_id);
CREATE INDEX idx_posts_platform ON public.posts(platform);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_published_at ON public.posts(published_at);

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts
CREATE POLICY "Users can view their own posts" ON public.posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- Create analytics table for detailed metrics
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube')),
  metric_date DATE NOT NULL,
  
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  
  video_views INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5,2) DEFAULT 0,
  
  audience_demographics JSONB DEFAULT '{}'::jsonb,
  detailed_metrics JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for analytics
CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_post_id ON public.analytics(post_id);
CREATE INDEX idx_analytics_campaign_id ON public.analytics(campaign_id);
CREATE INDEX idx_analytics_platform ON public.analytics(platform);
CREATE INDEX idx_analytics_metric_date ON public.analytics(metric_date);
CREATE UNIQUE INDEX idx_analytics_unique ON public.analytics(post_id, metric_date) WHERE post_id IS NOT NULL;

-- Enable RLS on analytics
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for analytics
CREATE POLICY "Users can view their own analytics" ON public.analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analytics" ON public.analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own analytics" ON public.analytics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own analytics" ON public.analytics FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers for both tables
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_analytics_updated_at
  BEFORE UPDATE ON public.analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create view for campaign analytics summary
CREATE VIEW public.campaign_analytics_summary AS
SELECT 
  a.campaign_id,
  a.user_id,
  c.name AS campaign_name,
  a.platform,
  SUM(a.impressions) AS total_impressions,
  SUM(a.reach) AS total_reach,
  SUM(a.engagement) AS total_engagement,
  SUM(a.likes) AS total_likes,
  SUM(a.comments) AS total_comments,
  SUM(a.shares) AS total_shares,
  SUM(a.clicks) AS total_clicks,
  AVG(a.engagement_rate) AS avg_engagement_rate,
  AVG(a.click_through_rate) AS avg_ctr,
  MIN(a.metric_date) AS first_metric_date,
  MAX(a.metric_date) AS last_metric_date
FROM public.analytics a
LEFT JOIN public.campaigns c ON a.campaign_id = c.id
WHERE a.campaign_id IS NOT NULL
GROUP BY a.campaign_id, a.user_id, c.name, a.platform;

-- Create view for daily performance summary
CREATE VIEW public.daily_performance_summary AS
SELECT 
  a.user_id,
  a.metric_date,
  SUM(a.impressions) AS total_impressions,
  SUM(a.reach) AS total_reach,
  SUM(a.engagement) AS total_engagement,
  SUM(a.likes) AS total_likes,
  SUM(a.comments) AS total_comments,
  SUM(a.shares) AS total_shares,
  SUM(a.clicks) AS total_clicks,
  AVG(a.engagement_rate) AS avg_engagement_rate,
  AVG(a.click_through_rate) AS avg_ctr,
  COUNT(DISTINCT a.post_id) AS posts_count,
  COUNT(DISTINCT a.campaign_id) AS campaigns_count
FROM public.analytics a
GROUP BY a.user_id, a.metric_date
ORDER BY a.metric_date DESC;