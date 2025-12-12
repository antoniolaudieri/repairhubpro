-- Add customer_paid_at field to repair_requests for tracking when customer pays Centro
ALTER TABLE public.repair_requests 
ADD COLUMN IF NOT EXISTS customer_paid_at timestamp with time zone DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.repair_requests.customer_paid_at IS 'Timestamp when customer paid the Centro (used for direct-to-centro Corner commissions)';