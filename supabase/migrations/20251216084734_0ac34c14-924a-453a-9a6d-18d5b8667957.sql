-- Add field to track phone acceptance of final cost
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS final_cost_accepted_by_phone BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.repairs.final_cost_accepted_by_phone IS 'Whether the final cost was accepted verbally by phone instead of digital signature';