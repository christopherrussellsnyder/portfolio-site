-- Table 1: uploaded_analytics - Stores screenshots of analytics dashboards
CREATE TABLE public.uploaded_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  platform text CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'google_analytics', 'shopify', 'other')),
  extracted_data jsonb,
  time_period_start date,
  time_period_end date,
  ai_insights text,
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_uploaded_analytics_user_id ON public.uploaded_analytics(user_id);
CREATE INDEX idx_uploaded_analytics_uploaded_at ON public.uploaded_analytics(uploaded_at DESC);

ALTER TABLE public.uploaded_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON public.uploaded_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON public.uploaded_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analytics" ON public.uploaded_analytics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analytics" ON public.uploaded_analytics FOR DELETE USING (auth.uid() = user_id);

-- Table 2: business_context - Stores website scraping results and business profile
CREATE TABLE public.business_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  website_url text NOT NULL,
  scraped_pages jsonb,
  business_profile jsonb,
  analyzed_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX idx_business_context_user_id ON public.business_context(user_id);
CREATE UNIQUE INDEX idx_business_context_active ON public.business_context(user_id) WHERE is_active = true;

ALTER TABLE public.business_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context" ON public.business_context FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own context" ON public.business_context FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own context" ON public.business_context FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own context" ON public.business_context FOR DELETE USING (auth.uid() = user_id);

-- Table 3: ai_conversations - Stores chat conversation sessions
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_updated_at ON public.ai_conversations(updated_at DESC);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for ai_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;

-- Table 4: ai_messages - Stores individual messages in conversations
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  attachments jsonb,
  context_used jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages(created_at);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- RLS policy joins through ai_conversations to check ownership
CREATE POLICY "Users can view own messages" ON public.ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE ai_conversations.id = ai_messages.conversation_id 
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own messages" ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE ai_conversations.id = ai_messages.conversation_id 
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own messages" ON public.ai_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE ai_conversations.id = ai_messages.conversation_id 
    AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own messages" ON public.ai_messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ai_conversations 
    WHERE ai_conversations.id = ai_messages.conversation_id 
    AND ai_conversations.user_id = auth.uid()
  ));

-- Enable realtime for ai_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;

-- Table 5: content_strategies - Stores generated content strategies
CREATE TABLE public.content_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  title text NOT NULL,
  platform text CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'multi')),
  duration_days integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  goals jsonb,
  content_mix jsonb,
  predicted_metrics jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_content_strategies_user_id ON public.content_strategies(user_id);
CREATE INDEX idx_content_strategies_created_at ON public.content_strategies(created_at DESC);

ALTER TABLE public.content_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategies" ON public.content_strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategies" ON public.content_strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies" ON public.content_strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies" ON public.content_strategies FOR DELETE USING (auth.uid() = user_id);

-- Table 6: strategy_posts - Stores individual posts within strategies
CREATE TABLE public.strategy_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES public.content_strategies(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  post_date date NOT NULL,
  post_time time,
  post_type text CHECK (post_type IN ('carousel', 'reel', 'video', 'single_image', 'story', 'text')),
  theme text,
  hook text,
  caption text NOT NULL,
  hashtags text[],
  cta text,
  predicted_reach integer,
  predicted_engagement numeric,
  rationale text,
  sort_order integer
);

CREATE INDEX idx_strategy_posts_strategy_id ON public.strategy_posts(strategy_id);
CREATE INDEX idx_strategy_posts_day_number ON public.strategy_posts(day_number);

ALTER TABLE public.strategy_posts ENABLE ROW LEVEL SECURITY;

-- RLS policy joins through content_strategies to check ownership
CREATE POLICY "Users can view own strategy posts" ON public.strategy_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.content_strategies 
    WHERE content_strategies.id = strategy_posts.strategy_id 
    AND content_strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own strategy posts" ON public.strategy_posts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.content_strategies 
    WHERE content_strategies.id = strategy_posts.strategy_id 
    AND content_strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own strategy posts" ON public.strategy_posts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.content_strategies 
    WHERE content_strategies.id = strategy_posts.strategy_id 
    AND content_strategies.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own strategy posts" ON public.strategy_posts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.content_strategies 
    WHERE content_strategies.id = strategy_posts.strategy_id 
    AND content_strategies.user_id = auth.uid()
  ));

-- Updated_at triggers
CREATE TRIGGER update_business_context_updated_at
  BEFORE UPDATE ON public.business_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function: Get user's active business context
CREATE OR REPLACE FUNCTION public.get_active_business_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'website_url', website_url,
    'business_profile', business_profile,
    'scraped_pages', scraped_pages,
    'analyzed_at', analyzed_at,
    'last_updated', last_updated
  )
  INTO v_context
  FROM public.business_context
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_context, '{}'::jsonb);
END;
$$;

-- Helper function: Get recent analytics for user
CREATE OR REPLACE FUNCTION public.get_recent_analytics(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analytics jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'platform', platform,
      'extracted_data', extracted_data,
      'time_period_start', time_period_start,
      'time_period_end', time_period_end,
      'ai_insights', ai_insights,
      'uploaded_at', uploaded_at
    )
    ORDER BY uploaded_at DESC
  )
  INTO v_analytics
  FROM (
    SELECT * FROM public.uploaded_analytics
    WHERE user_id = p_user_id
    ORDER BY uploaded_at DESC
    LIMIT p_limit
  ) recent;
  
  RETURN COALESCE(v_analytics, '[]'::jsonb);
END;
$$;