-- Create storage bucket for centro logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('centro-logos', 'centro-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own logo
CREATE POLICY "Users can upload their centro logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'centro-logos' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access to logos
CREATE POLICY "Anyone can view centro logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'centro-logos');

-- Allow users to update their own logo
CREATE POLICY "Users can update their centro logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'centro-logos' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own logo
CREATE POLICY "Users can delete their centro logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'centro-logos' AND auth.uid() IS NOT NULL);