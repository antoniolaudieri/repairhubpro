-- Add individual direct_to_centro_multiplier field for each Corner
ALTER TABLE public.corners 
ADD COLUMN IF NOT EXISTS direct_to_centro_multiplier numeric DEFAULT 50;

COMMENT ON COLUMN public.corners.direct_to_centro_multiplier IS 'Percentage multiplier for corner commission when direct to centro (default 50 = half commission)';