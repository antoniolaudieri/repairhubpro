-- Allow anyone to increment views_count on published devices
CREATE POLICY "Anyone can increment views on published devices" 
ON public.used_devices 
FOR UPDATE 
USING (status = 'published')
WITH CHECK (status = 'published');