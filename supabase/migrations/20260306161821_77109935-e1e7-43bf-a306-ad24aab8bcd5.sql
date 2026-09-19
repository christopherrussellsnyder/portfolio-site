
-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created ON public.ai_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_user_date ON public.uploaded_analytics(user_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_strategies_user_date ON public.content_strategies(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_context_user_active ON public.business_context(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_user ON public.user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status ON public.scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_performance_user ON public.content_performance(user_id, created_at DESC);

-- Cache entries table for AI response caching
CREATE TABLE IF NOT EXISTS public.cache_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  cache_type text NOT NULL DEFAULT 'ai_response',
  cached_data jsonb NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_entries_key_expires ON public.cache_entries(cache_key, expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_user ON public.cache_entries(user_id);

ALTER TABLE public.cache_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cache" ON public.cache_entries
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cache" ON public.cache_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cache" ON public.cache_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cache" ON public.cache_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
