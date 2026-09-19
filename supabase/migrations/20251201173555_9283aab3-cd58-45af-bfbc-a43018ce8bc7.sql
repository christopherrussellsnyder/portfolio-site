CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL,
  platforms TEXT[] NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  recurrence TEXT,
  recurrence_end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  published_at TIMESTAMPTZ,
  error_message TEXT,
  media_urls TEXT[],
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL,
  actions JSONB NOT NULL,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX idx_automation_rules_is_active ON automation_rules(is_active);