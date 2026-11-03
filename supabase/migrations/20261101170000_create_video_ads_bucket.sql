-- The video-ads storage bucket was never actually created -- a prior
-- migration (20260806151918) added its RLS policies (owner-only SELECT/
-- INSERT/UPDATE/DELETE, no public-read policy), but the bucket itself was
-- missing, so every upload in video-ad-status failed with "Bucket not
-- found." The render would complete on HeyGen's side, download
-- successfully, then fail at the upload step, which left the row stuck on
-- "processing" forever (the error path never marks it failed, so polling
-- retried indefinitely). Private bucket, matching the owner-only RLS
-- policies and the signed-URL playback pattern already used in
-- video-ad-status/index.ts (createSignedUrl, not getPublicUrl).
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-ads', 'video-ads', false)
ON CONFLICT (id) DO NOTHING;
