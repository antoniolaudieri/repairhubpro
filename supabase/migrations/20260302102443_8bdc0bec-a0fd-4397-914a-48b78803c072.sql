ALTER TABLE public.ricondizionati_campaign_recipients 
ADD COLUMN IF NOT EXISTS copied_coupon_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS copy_count INTEGER DEFAULT 0;

ALTER TABLE public.ricondizionati_campaigns 
ADD COLUMN IF NOT EXISTS total_copied INTEGER DEFAULT 0;