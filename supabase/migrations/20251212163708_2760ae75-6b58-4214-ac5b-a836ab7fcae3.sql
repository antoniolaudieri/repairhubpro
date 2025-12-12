-- Add field to track when customer goes directly to Centro (halves Corner commission)
ALTER TABLE public.repair_requests 
ADD COLUMN IF NOT EXISTS corner_direct_to_centro BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.repair_requests.corner_direct_to_centro IS 'When true, customer goes directly to Centro and Corner commission is halved';