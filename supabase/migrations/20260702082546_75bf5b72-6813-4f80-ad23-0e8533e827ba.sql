
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
  ON public.ai_conversations (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
  ON public.ai_messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_content_strategies_user_created
  ON public.content_strategies (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategy_posts_strategy_sort
  ON public.strategy_posts (strategy_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_uploaded_analytics_user_uploaded
  ON public.uploaded_analytics (user_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status_created
  ON public.contact_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user
  ON public.usage_tracking (user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status_pub
  ON public.scheduled_posts (user_id, status, published_at DESC);
