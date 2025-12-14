-- Add opening_hours JSONB field to corners table
ALTER TABLE public.corners ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- Add opening_hours JSONB field to centri_assistenza table
ALTER TABLE public.centri_assistenza ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- Add comment to explain the structure
COMMENT ON COLUMN public.corners.opening_hours IS 'Opening hours as JSON: {"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}';
COMMENT ON COLUMN public.centri_assistenza.opening_hours IS 'Opening hours as JSON: {"monday": {"open": "09:00", "close": "18:00", "closed": false}, ...}';