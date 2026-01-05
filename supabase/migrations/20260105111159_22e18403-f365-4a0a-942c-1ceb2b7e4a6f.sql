-- Create storage policies for device-photos bucket
CREATE POLICY "Allow authenticated users to upload device photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-photos');

CREATE POLICY "Allow authenticated users to update device photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'device-photos')
WITH CHECK (bucket_id = 'device-photos');

CREATE POLICY "Allow public read access to device photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'device-photos');

CREATE POLICY "Allow authenticated users to delete device photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'device-photos');