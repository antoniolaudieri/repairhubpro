-- Create device-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('device-photos', 'device-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload device photos
CREATE POLICY "Technicians can upload device photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'device-photos' AND
  (SELECT has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'))
);

-- Policy: Allow authenticated users to read device photos
CREATE POLICY "Technicians can view device photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'device-photos' AND
  (SELECT has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'))
);

-- Policy: Allow public access to view device photos
CREATE POLICY "Public can view device photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'device-photos');