
-- Add unsubscribed_at to recipients
ALTER TABLE public.ricondizionati_campaign_recipients 
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- Add total_unsubscribed to campaigns
ALTER TABLE public.ricondizionati_campaigns 
  ADD COLUMN IF NOT EXISTS total_unsubscribed integer DEFAULT 0;

-- Enable realtime on recipients table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ricondizionati_campaign_recipients;
