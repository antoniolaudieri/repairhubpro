-- Add corner_id column to device_price_valuations for Corner price history
ALTER TABLE public.device_price_valuations 
ADD COLUMN corner_id uuid REFERENCES public.corners(id) ON DELETE SET NULL;

-- Update constraint for device_price_valuations
ALTER TABLE public.device_price_valuations 
DROP CONSTRAINT IF EXISTS device_price_valuations_centro_id_fkey;

-- Make centro_id nullable
ALTER TABLE public.device_price_valuations 
ALTER COLUMN centro_id DROP NOT NULL;

-- Re-add the foreign key for centro_id
ALTER TABLE public.device_price_valuations 
ADD CONSTRAINT device_price_valuations_centro_id_fkey 
FOREIGN KEY (centro_id) REFERENCES public.centri_assistenza(id) ON DELETE SET NULL;

-- Add RLS policy for Corners to manage their price valuations
CREATE POLICY "Corner owners can manage their valuations" 
ON public.device_price_valuations 
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