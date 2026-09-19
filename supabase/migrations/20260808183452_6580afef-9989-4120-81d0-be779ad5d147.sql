DROP POLICY IF EXISTS "Users read own ad scene assets" ON storage.objects;
CREATE POLICY "Users read own ad scene assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ad-scene-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users write own ad scene assets" ON storage.objects;
CREATE POLICY "Users write own ad scene assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ad-scene-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own ad scene assets" ON storage.objects;
CREATE POLICY "Users delete own ad scene assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ad-scene-assets' AND (storage.foldername(name))[1] = auth.uid()::text);