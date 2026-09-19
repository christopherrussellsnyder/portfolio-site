-- Create storage bucket for analytics screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('analytics-screenshots', 'analytics-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view files (public read)
CREATE POLICY "Public read access for analytics screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'analytics-screenshots');

-- Policy: Authenticated users can upload their own files
CREATE POLICY "Authenticated users can upload analytics screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'analytics-screenshots' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own analytics screenshots"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'analytics-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own analytics screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'analytics-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);