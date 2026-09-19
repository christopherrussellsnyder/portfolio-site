-- Create user_profiles table for enhanced profile and security settings
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile Info
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  
  -- Security
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  backup_codes TEXT[],
  
  -- Account Status
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active',
  
  -- Timestamps
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Create user_roles table (following security best practices - roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  invitation_token UUID,
  invitation_email TEXT,
  invitation_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view own team"
  ON public.team_members FOR SELECT
  USING (
    auth.uid() = user_id OR 
    auth.uid() = team_id OR
    team_id IN (
      SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can manage members"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = team_id OR auth.uid() = invited_by);

CREATE POLICY "Team owners can update members"
  ON public.team_members FOR UPDATE
  USING (auth.uid() = team_id);

CREATE POLICY "Team owners can delete members"
  ON public.team_members FOR DELETE
  USING (auth.uid() = team_id);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for activity_logs
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Create login_sessions table
CREATE TABLE IF NOT EXISTS public.login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  device_type TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  city TEXT,
  country TEXT,
  is_current BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS on login_sessions
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.login_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.login_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.login_sessions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.login_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Also create default owner role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();