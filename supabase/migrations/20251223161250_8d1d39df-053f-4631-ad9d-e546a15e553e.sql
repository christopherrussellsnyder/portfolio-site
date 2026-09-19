-- Create storage bucket for media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for users to manage their own media
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to media bucket (for sharing)
CREATE POLICY "Public can view media files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');