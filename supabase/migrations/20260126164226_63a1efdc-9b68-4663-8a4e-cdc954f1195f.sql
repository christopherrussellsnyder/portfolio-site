-- Create connected_accounts table for social platform OAuth tokens
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  platform_profile_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform ON public.connected_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_platform ON public.connected_accounts(user_id, platform);

-- Enable RLS
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own connected accounts
CREATE POLICY "Users can view own connected accounts"
ON public.connected_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connected accounts"
ON public.connected_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connected accounts"
ON public.connected_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connected accounts"
ON public.connected_accounts FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_connected_accounts_updated_at
BEFORE UPDATE ON public.connected_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();