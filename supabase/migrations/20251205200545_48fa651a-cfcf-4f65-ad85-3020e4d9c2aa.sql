-- Allow public read access to approved corners for the map
CREATE POLICY "Anyone can view approved corners on map" 
ON public.corners 
FOR SELECT 
USING (status = 'approved');

-- Allow public read access to approved centri for the map
CREATE POLICY "Anyone can view approved centri on map" 
ON public.centri_assistenza 
FOR SELECT 
USING (status = 'approved');