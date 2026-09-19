-- Posts indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_time ON scheduled_posts(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_campaign ON scheduled_posts(campaign_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_post ON analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_analytics_campaign ON analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics(user_id, metric_date DESC);

-- Content library indexes
CREATE INDEX IF NOT EXISTS idx_content_user_created ON content_library(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_type ON content_library(content_type);
CREATE INDEX IF NOT EXISTS idx_content_folder ON content_library(folder_id);

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);

-- Media library indexes
CREATE INDEX IF NOT EXISTS idx_media_user ON media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_library(folder_id);

-- AI usage indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage_logs(request_type);

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_campaign ON posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Performance data indexes
CREATE INDEX IF NOT EXISTS idx_performance_user_date ON performance_data(user_id, date DESC);

-- Audiences indexes
CREATE INDEX IF NOT EXISTS idx_audiences_user ON audiences(user_id);
CREATE INDEX IF NOT EXISTS idx_audiences_favorite ON audiences(is_favorite) WHERE is_favorite = true;