-- Add RLS policy for Corners to manage their used devices
CREATE POLICY "Corner owners can manage their devices" 
ON public.used_devices 
FOR ALL 
USING (centro_id IN ( 
  SELECT corners.id 
  FROM corners 
  WHERE corners.user_id = auth.uid()
))
WITH CHECK (centro_id IN ( 
  SELECT corners.id 
  FROM corners 
  WHERE corners.user_id = auth.uid()
));