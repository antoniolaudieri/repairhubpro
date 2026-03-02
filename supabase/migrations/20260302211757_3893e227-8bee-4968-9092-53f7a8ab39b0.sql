
-- Create public bucket for marketing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-images', 'marketing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload marketing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'marketing-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update marketing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'marketing-images');

-- Allow public read access
CREATE POLICY "Public read access for marketing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete marketing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'marketing-images');
