-- Add corner gestione fee fields to repair_requests
ALTER TABLE public.repair_requests
ADD COLUMN IF NOT EXISTS corner_gestione_fee numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS corner_gestione_fee_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS corner_gestione_fee_collected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS corner_gestione_fee_collected_at timestamp with time zone;

-- Add comments
COMMENT ON COLUMN public.repair_requests.corner_gestione_fee IS 'Corner management fee amount (default €15)';
COMMENT ON COLUMN public.repair_requests.corner_gestione_fee_enabled IS 'Whether the gestione fee was enabled for this request';
COMMENT ON COLUMN public.repair_requests.corner_gestione_fee_collected IS 'Whether the fee has been collected from customer';
COMMENT ON COLUMN public.repair_requests.corner_gestione_fee_collected_at IS 'Timestamp when the fee was collected';