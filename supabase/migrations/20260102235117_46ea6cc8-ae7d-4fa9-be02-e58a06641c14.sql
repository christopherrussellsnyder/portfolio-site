-- Content embeddings for ML analysis
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  embedding_vector NUMERIC[] NOT NULL,
  topic_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  sentiment_score NUMERIC,
  sentiment_label TEXT,
  readability_score NUMERIC,
  word_count INTEGER,
  sentence_count INTEGER,
  key_phrases TEXT[] DEFAULT ARRAY[]::TEXT[],
  virality_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_user ON content_embeddings(user_id);
CREATE INDEX idx_embeddings_post ON content_embeddings(post_id);

-- Enable RLS
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings" ON content_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings" ON content_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings" ON content_embeddings
  FOR DELETE USING (auth.uid() = user_id);

-- Virality predictions table
CREATE TABLE IF NOT EXISTS virality_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  virality_score NUMERIC NOT NULL,
  virality_category TEXT NOT NULL,
  predicted_impressions INTEGER,
  predicted_engagement_rate NUMERIC,
  predicted_shares INTEGER,
  success_factors JSONB DEFAULT '{}'::jsonb,
  trending_elements TEXT[] DEFAULT ARRAY[]::TEXT[],
  improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  actual_performance JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, content_hash)
);

CREATE INDEX idx_virality_user ON virality_predictions(user_id);
CREATE INDEX idx_virality_score ON virality_predictions(virality_score DESC);
CREATE INDEX idx_virality_hash ON virality_predictions(content_hash);

-- Enable RLS
ALTER TABLE virality_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predictions" ON virality_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions" ON virality_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions" ON virality_predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions" ON virality_predictions
  FOR DELETE USING (auth.uid() = user_id);

-- Trending topics table
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL UNIQUE,
  category TEXT,
  trend_score NUMERIC DEFAULT 0,
  mention_count INTEGER DEFAULT 0,
  growth_rate NUMERIC DEFAULT 0,
  related_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  detected_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trending_score ON trending_topics(trend_score DESC);
CREATE INDEX idx_trending_category ON trending_topics(category);

-- Enable RLS (public read)
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending topics" ON trending_topics
  FOR SELECT USING (true);

-- Content improvement history
CREATE TABLE IF NOT EXISTS content_improvement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_content TEXT NOT NULL,
  improved_content TEXT NOT NULL,
  improvement_type TEXT NOT NULL,
  original_score NUMERIC,
  improved_score NUMERIC,
  score_improvement NUMERIC,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_improvements_user ON content_improvement_history(user_id);
CREATE INDEX idx_improvements_applied ON content_improvement_history(applied);

-- Enable RLS
ALTER TABLE content_improvement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own improvements" ON content_improvement_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own improvements" ON content_improvement_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert sample trending topics
INSERT INTO trending_topics (topic, category, trend_score, mention_count, growth_rate, related_keywords) VALUES
('AI', 'technology', 95, 15000, 45, ARRAY['artificial intelligence', 'machine learning', 'automation']),
('productivity', 'business', 88, 12000, 32, ARRAY['efficiency', 'workflow', 'time management']),
('sustainability', 'lifestyle', 82, 9000, 28, ARRAY['eco-friendly', 'green', 'environment']),
('remote work', 'business', 78, 8500, 25, ARRAY['work from home', 'hybrid', 'digital nomad']),
('mental health', 'wellness', 85, 11000, 38, ARRAY['mindfulness', 'self-care', 'therapy']),
('web3', 'technology', 72, 6000, 22, ARRAY['blockchain', 'crypto', 'decentralization']),
('climate change', 'environment', 80, 10000, 30, ARRAY['global warming', 'carbon', 'renewable']),
('diversity', 'culture', 75, 7500, 20, ARRAY['inclusion', 'equity', 'representation'])
ON CONFLICT (topic) DO NOTHING;

-- Function to analyze content structure
CREATE OR REPLACE FUNCTION analyze_content_structure(p_content TEXT)
RETURNS TABLE (
  word_count INTEGER,
  sentence_count INTEGER,
  avg_word_length NUMERIC,
  unique_words INTEGER,
  uppercase_ratio NUMERIC,
  punctuation_density NUMERIC,
  question_count INTEGER,
  exclamation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_words TEXT[];
  v_sentences TEXT[];
BEGIN
  v_words := regexp_split_to_array(lower(p_content), '\s+');
  v_sentences := regexp_split_to_array(p_content, '[.!?]+');
  
  RETURN QUERY SELECT
    array_length(v_words, 1)::INTEGER,
    array_length(v_sentences, 1)::INTEGER,
    ROUND(AVG(length(word))::NUMERIC, 2),
    (SELECT COUNT(DISTINCT word) FROM unnest(v_words) word)::INTEGER,
    ROUND((length(regexp_replace(p_content, '[^A-Z]', '', 'g'))::NUMERIC / GREATEST(length(p_content), 1)) * 100, 2),
    ROUND((length(regexp_replace(p_content, '[^.,!?;:]', '', 'g'))::NUMERIC / GREATEST(length(p_content), 1)) * 100, 2),
    (SELECT COUNT(*) FROM regexp_matches(p_content, '\?', 'g'))::INTEGER,
    (SELECT COUNT(*) FROM regexp_matches(p_content, '!', 'g'))::INTEGER;
END;
$$;