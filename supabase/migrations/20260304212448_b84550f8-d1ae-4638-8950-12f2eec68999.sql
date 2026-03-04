
-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('auction-images', 'auction-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read auction images (public bucket)
CREATE POLICY "Public read access for auction images"
ON storage.objects FOR SELECT
USING (bucket_id = 'auction-images');

-- Allow authenticated users to upload auction images
CREATE POLICY "Authenticated users can upload auction images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'auction-images');

-- Allow authenticated users to delete their auction images
CREATE POLICY "Authenticated users can delete auction images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'auction-images');
