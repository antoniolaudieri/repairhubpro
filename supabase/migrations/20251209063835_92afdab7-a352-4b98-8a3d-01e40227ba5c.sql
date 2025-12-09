-- Create storage bucket for used device photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('used-device-photos', 'used-device-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view used device photos (public bucket)
CREATE POLICY "Anyone can view used device photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'used-device-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload used device photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'used-device-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update used device photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'used-device-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete used device photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'used-device-photos' AND auth.role() = 'authenticated');