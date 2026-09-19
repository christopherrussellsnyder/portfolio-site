-- Create niche_strategies table for business niche best practices
CREATE TABLE public.niche_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  niche TEXT NOT NULL,
  platform TEXT NOT NULL,
  priority_score INTEGER DEFAULT 0,
  recommended_content_types TEXT[] DEFAULT '{}',
  recommended_posting_frequency TEXT,
  optimal_content_mix JSONB,
  messaging_themes TEXT[] DEFAULT '{}',
  best_practices TEXT[] DEFAULT '{}',
  sample_strategies JSONB DEFAULT '[]'::jsonb,
  avg_engagement_benchmark NUMERIC DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaigns_learning table for tracking campaign learnings
CREATE TABLE public.campaigns_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  niche TEXT,
  learning_type TEXT NOT NULL, -- 'content_type', 'timing', 'messaging', 'cta', 'hashtags'
  pattern_value TEXT NOT NULL,
  performance_impact NUMERIC DEFAULT 0, -- positive or negative percentage
  confidence_level TEXT DEFAULT 'low',
  sample_size INTEGER DEFAULT 0,
  impressions_total INTEGER DEFAULT 0,
  engagement_total INTEGER DEFAULT 0,
  conversions_total INTEGER DEFAULT 0,
  cpm NUMERIC,
  cpc NUMERIC,
  roas NUMERIC,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  applies_to_future BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create platform_niche_benchmarks for performance standards
CREATE TABLE public.platform_niche_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  niche TEXT NOT NULL,
  avg_engagement_rate NUMERIC DEFAULT 0,
  avg_ctr NUMERIC DEFAULT 0,
  avg_cpm NUMERIC DEFAULT 0,
  avg_cpc NUMERIC DEFAULT 0,
  avg_roas NUMERIC DEFAULT 0,
  top_content_types TEXT[] DEFAULT '{}',
  optimal_posting_times INTEGER[] DEFAULT '{}',
  optimal_posting_days INTEGER[] DEFAULT '{}',
  recommended_post_frequency TEXT,
  sample_size INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(platform, niche)
);

-- Add learning columns to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS niche TEXT,
ADD COLUMN IF NOT EXISTS learning_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS optimization_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS predicted_performance JSONB,
ADD COLUMN IF NOT EXISTS actual_vs_predicted JSONB,
ADD COLUMN IF NOT EXISTS post_campaign_learnings JSONB;

-- Add more tracking to campaign_performance_tracking
ALTER TABLE public.campaign_performance_tracking
ADD COLUMN IF NOT EXISTS content_type_breakdown JSONB,
ADD COLUMN IF NOT EXISTS timing_breakdown JSONB,
ADD COLUMN IF NOT EXISTS top_performing_posts JSONB,
ADD COLUMN IF NOT EXISTS underperforming_posts JSONB,
ADD COLUMN IF NOT EXISTS optimization_suggestions JSONB;

-- Enable RLS
ALTER TABLE public.niche_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_niche_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS for niche_strategies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view niche strategies" ON public.niche_strategies
  FOR SELECT TO authenticated USING (true);

-- RLS for campaigns_learning
CREATE POLICY "Users can view own campaign learnings" ON public.campaigns_learning
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaign learnings" ON public.campaigns_learning
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign learnings" ON public.campaigns_learning
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign learnings" ON public.campaigns_learning
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for platform_niche_benchmarks (read-only)
CREATE POLICY "Authenticated users can view benchmarks" ON public.platform_niche_benchmarks
  FOR SELECT TO authenticated USING (true);

-- Create indexes
CREATE INDEX idx_niche_strategies_lookup ON public.niche_strategies(niche, platform);
CREATE INDEX idx_campaigns_learning_user ON public.campaigns_learning(user_id, platform);
CREATE INDEX idx_campaigns_learning_campaign ON public.campaigns_learning(campaign_id);
CREATE INDEX idx_platform_niche_benchmarks_lookup ON public.platform_niche_benchmarks(platform, niche);

-- Insert initial niche strategy data
INSERT INTO public.niche_strategies (niche, platform, priority_score, recommended_content_types, recommended_posting_frequency, optimal_content_mix, messaging_themes, best_practices) VALUES
('ecommerce', 'instagram', 95, ARRAY['reels', 'carousels', 'stories'], '2-3 posts/day', '{"video": 40, "image": 35, "carousel": 25}', ARRAY['product showcase', 'behind the scenes', 'user generated content', 'lifestyle'], ARRAY['Use shoppable posts', 'Leverage UGC for social proof', 'Create urgency with limited offers']),
('ecommerce', 'facebook', 85, ARRAY['video', 'carousel', 'live'], '1-2 posts/day', '{"video": 45, "image": 30, "carousel": 25}', ARRAY['community building', 'customer stories', 'promotions'], ARRAY['Use Facebook Shops', 'Run retargeting campaigns', 'Engage in groups']),
('ecommerce', 'tiktok', 90, ARRAY['short-form video'], '2-4 videos/day', '{"video": 100}', ARRAY['trending sounds', 'product demos', 'unboxing', 'reviews'], ARRAY['Hook in first 3 seconds', 'Use trending sounds', 'Partner with creators']),
('saas', 'linkedin', 95, ARRAY['articles', 'documents', 'video'], '1 post/day', '{"text": 40, "document": 30, "video": 30}', ARRAY['thought leadership', 'industry insights', 'product updates', 'case studies'], ARRAY['Share data-driven insights', 'Engage with comments', 'Use native documents']),
('saas', 'twitter', 90, ARRAY['threads', 'text', 'video'], '3-5 tweets/day', '{"text": 60, "thread": 25, "video": 15}', ARRAY['tips and tricks', 'product launches', 'industry news', 'customer wins'], ARRAY['Use threads for long content', 'Engage in trending topics', 'Quick responses']),
('consulting', 'linkedin', 95, ARRAY['articles', 'text', 'video'], '1 post/day', '{"text": 50, "article": 30, "video": 20}', ARRAY['expertise sharing', 'case studies', 'client testimonials', 'industry analysis'], ARRAY['Personal branding', 'Thought leadership posts', 'Engage with industry leaders']),
('consulting', 'twitter', 80, ARRAY['threads', 'text'], '2-3 tweets/day', '{"text": 70, "thread": 30}', ARRAY['quick insights', 'industry commentary', 'tips'], ARRAY['Build authority through threads', 'Quote tweet with insights']),
('local_business', 'facebook', 95, ARRAY['image', 'video', 'live'], '1 post/day', '{"image": 50, "video": 30, "live": 20}', ARRAY['local events', 'behind the scenes', 'customer spotlights', 'community involvement'], ARRAY['Respond to reviews', 'Use location tags', 'Run local ads']),
('local_business', 'instagram', 90, ARRAY['reels', 'stories', 'image'], '1-2 posts/day', '{"image": 40, "reels": 35, "stories": 25}', ARRAY['team highlights', 'product/service demos', 'customer appreciation'], ARRAY['Use location stickers', 'Engage with local hashtags', 'Share stories daily']),
('fitness', 'instagram', 95, ARRAY['reels', 'stories', 'carousels'], '2-3 posts/day', '{"reels": 45, "image": 30, "carousel": 25}', ARRAY['workout tutorials', 'transformation stories', 'nutrition tips', 'motivation'], ARRAY['Consistent posting schedule', 'Use workout hashtags', 'Before/after content']),
('fitness', 'tiktok', 95, ARRAY['short-form video'], '2-4 videos/day', '{"video": 100}', ARRAY['quick workouts', 'fitness challenges', 'gym tips'], ARRAY['Trending challenges', 'Educational content', 'Partner with fitness creators']),
('education', 'linkedin', 90, ARRAY['articles', 'documents', 'video'], '1 post/day', '{"document": 40, "text": 35, "video": 25}', ARRAY['educational content', 'industry insights', 'career tips', 'course promotion'], ARRAY['Share valuable resources', 'Use carousel documents', 'Thought leadership']),
('education', 'instagram', 80, ARRAY['carousels', 'reels', 'stories'], '1-2 posts/day', '{"carousel": 45, "reels": 35, "image": 20}', ARRAY['tips and tricks', 'quick lessons', 'behind the scenes'], ARRAY['Educational carousels', 'Save-worthy content', 'Interactive stories']),
('healthcare', 'linkedin', 90, ARRAY['articles', 'text', 'video'], '3-4 posts/week', '{"text": 45, "article": 35, "video": 20}', ARRAY['health tips', 'industry news', 'patient stories', 'professional insights'], ARRAY['HIPAA compliance', 'Credibility building', 'Educational focus']),
('healthcare', 'facebook', 85, ARRAY['video', 'image', 'live'], '3-4 posts/week', '{"video": 40, "image": 40, "live": 20}', ARRAY['health awareness', 'community wellness', 'Q&A sessions'], ARRAY['Build trust through transparency', 'Community engagement', 'Health tips']),
('finance', 'linkedin', 95, ARRAY['articles', 'documents', 'text'], '1 post/day', '{"text": 40, "document": 40, "video": 20}', ARRAY['market insights', 'financial tips', 'industry analysis', 'regulatory updates'], ARRAY['Data-driven content', 'Regulatory compliance', 'Thought leadership']),
('finance', 'twitter', 90, ARRAY['threads', 'text'], '3-5 tweets/day', '{"text": 60, "thread": 40}', ARRAY['market commentary', 'quick tips', 'news reactions'], ARRAY['Real-time market updates', 'Educational threads', 'Engage with fintwit']),
('real_estate', 'instagram', 95, ARRAY['reels', 'carousels', 'stories'], '1-2 posts/day', '{"reels": 40, "image": 35, "carousel": 25}', ARRAY['property tours', 'market updates', 'home tips', 'neighborhood guides'], ARRAY['High-quality visuals', 'Virtual tours', 'Local market expertise']),
('real_estate', 'facebook', 90, ARRAY['video', 'live', 'carousel'], '1 post/day', '{"video": 45, "image": 35, "live": 20}', ARRAY['new listings', 'open houses', 'market analysis', 'buyer tips'], ARRAY['Facebook Marketplace', 'Local community groups', 'Live virtual tours']);

-- Insert platform niche benchmarks
INSERT INTO public.platform_niche_benchmarks (platform, niche, avg_engagement_rate, avg_ctr, avg_cpm, avg_cpc, top_content_types, optimal_posting_times, optimal_posting_days, recommended_post_frequency) VALUES
('instagram', 'ecommerce', 3.5, 1.2, 8.50, 0.70, ARRAY['reels', 'carousels'], ARRAY[9, 12, 17, 20], ARRAY[1, 2, 3, 4], '2-3 posts/day'),
('instagram', 'fitness', 4.2, 1.5, 7.00, 0.55, ARRAY['reels', 'stories'], ARRAY[6, 12, 18], ARRAY[1, 3, 5], '2-3 posts/day'),
('instagram', 'real_estate', 2.8, 0.9, 12.00, 1.20, ARRAY['reels', 'carousels'], ARRAY[10, 14, 19], ARRAY[2, 4], '1-2 posts/day'),
('facebook', 'ecommerce', 2.5, 1.0, 10.00, 0.85, ARRAY['video', 'carousel'], ARRAY[13, 16, 20], ARRAY[3, 4, 5], '1-2 posts/day'),
('facebook', 'local_business', 4.0, 1.8, 6.00, 0.45, ARRAY['image', 'video', 'live'], ARRAY[9, 12, 19], ARRAY[2, 4, 6], '1 post/day'),
('facebook', 'healthcare', 2.2, 0.8, 15.00, 1.50, ARRAY['video', 'article'], ARRAY[10, 14], ARRAY[2, 3], '3-4 posts/week'),
('linkedin', 'saas', 3.8, 2.1, 35.00, 5.50, ARRAY['documents', 'video'], ARRAY[8, 10, 17], ARRAY[2, 3, 4], '1 post/day'),
('linkedin', 'consulting', 4.5, 2.5, 30.00, 4.50, ARRAY['text', 'articles'], ARRAY[7, 12, 17], ARRAY[2, 3, 4], '1 post/day'),
('linkedin', 'finance', 3.2, 1.8, 40.00, 6.00, ARRAY['documents', 'text'], ARRAY[8, 12, 16], ARRAY[1, 2, 3, 4], '1 post/day'),
('twitter', 'saas', 2.8, 1.5, 6.50, 0.80, ARRAY['threads', 'video'], ARRAY[9, 12, 15, 18], ARRAY[1, 2, 3, 4], '3-5 tweets/day'),
('twitter', 'finance', 2.5, 1.2, 8.00, 1.00, ARRAY['threads', 'text'], ARRAY[8, 12, 16, 20], ARRAY[1, 2, 3, 4, 5], '3-5 tweets/day'),
('tiktok', 'ecommerce', 5.5, 2.0, 5.00, 0.35, ARRAY['short-form video'], ARRAY[7, 12, 19, 22], ARRAY[0, 4, 5, 6], '2-4 videos/day'),
('tiktok', 'fitness', 6.0, 2.5, 4.50, 0.30, ARRAY['short-form video'], ARRAY[6, 12, 18, 21], ARRAY[0, 1, 5, 6], '2-4 videos/day'),
('tiktok', 'education', 4.8, 1.8, 5.50, 0.40, ARRAY['short-form video'], ARRAY[8, 15, 20], ARRAY[1, 2, 3, 4], '1-3 videos/day');