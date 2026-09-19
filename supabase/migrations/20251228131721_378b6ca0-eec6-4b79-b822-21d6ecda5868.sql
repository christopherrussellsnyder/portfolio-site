-- Drop the existing content_type check constraint if it exists
ALTER TABLE content_library DROP CONSTRAINT IF EXISTS content_library_content_type_check;

-- Add new constraint that includes all the content types used in the UI
ALTER TABLE content_library 
ADD CONSTRAINT content_library_content_type_check 
CHECK (content_type IN ('text', 'image', 'video', 'carousel', 'story', 'link', 'document'));