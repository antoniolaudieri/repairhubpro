-- Add logo_url column to corners table (like centri_assistenza has)
ALTER TABLE public.corners 
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.corners.logo_url IS 'URL of the corner logo stored in centro-logos bucket';