-- Add payment collection method to quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS payment_collection_method text DEFAULT 'direct';

-- Add comment
COMMENT ON COLUMN public.quotes.payment_collection_method IS 'Payment collection method: direct (Centro collects from customer) or via_corner (Corner collects and remits to Centro)';