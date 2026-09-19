
-- 1. CRITICAL: Fix team_members privilege escalation
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
CREATE POLICY "Team owners can insert members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = team_id);

-- 2. Storage: remove overly-broad SELECT policies on sensitive buckets
DROP POLICY IF EXISTS "Users can view all AI videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for analytics screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media files" ON storage.objects;

-- Add owner-scoped SELECT for ai-videos
CREATE POLICY "Users can view own AI videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ai-videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add owner-scoped SELECT for analytics screenshots
CREATE POLICY "Users can view own analytics screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'analytics-screenshots'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. content_trends: remove overly permissive write policy.
-- SELECT remains open; service_role bypasses RLS for backend writes.
DROP POLICY IF EXISTS "System can manage trends" ON public.content_trends;

-- 4. Lock down search_path on internal helper functions
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
