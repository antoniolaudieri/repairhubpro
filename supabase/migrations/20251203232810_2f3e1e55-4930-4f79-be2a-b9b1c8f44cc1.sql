-- Add separate payment tracking for platform and corner commissions
ALTER TABLE public.commission_ledger 
ADD COLUMN IF NOT EXISTS platform_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS platform_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS corner_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS corner_paid_at timestamp with time zone;

-- Add index for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_commission_ledger_platform_paid ON public.commission_ledger(platform_paid);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_corner_paid ON public.commission_ledger(corner_paid);