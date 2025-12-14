-- Add payment request tracking columns to display_ad_campaign_corners
ALTER TABLE public.display_ad_campaign_corners
ADD COLUMN IF NOT EXISTS payment_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.display_ad_campaign_corners.payment_status IS 'pending, requested, paid';