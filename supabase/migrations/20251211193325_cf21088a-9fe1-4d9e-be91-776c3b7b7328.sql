-- Add corner_id column to used_devices table for Corner ownership
ALTER TABLE public.used_devices 
ADD COLUMN corner_id uuid REFERENCES public.corners(id) ON DELETE SET NULL;

-- Make centro_id nullable since devices can belong to either Centro OR Corner
ALTER TABLE public.used_devices 
ALTER COLUMN centro_id DROP NOT NULL;

-- Add check constraint to ensure device belongs to either Centro OR Corner
ALTER TABLE public.used_devices 
ADD CONSTRAINT used_devices_owner_check 
CHECK (centro_id IS NOT NULL OR corner_id IS NOT NULL);

-- Update RLS policy for Corners to use corner_id
DROP POLICY IF EXISTS "Corner owners can manage their devices" ON public.used_devices;

CREATE POLICY "Corner owners can manage their devices" 
ON public.used_devices 
FOR ALL 
USING (corner_id IN ( 
  SELECT corners.id 
  FROM corners 
  WHERE corners.user_id = auth.uid()
))
WITH CHECK (corner_id IN ( 
  SELECT corners.id 
  FROM corners 
  WHERE corners.user_id = auth.uid()
));