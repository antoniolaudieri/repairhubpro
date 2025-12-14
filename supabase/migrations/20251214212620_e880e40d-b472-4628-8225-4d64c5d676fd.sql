-- Aggiungi campi per countdown, logo azienda e QR code tracciabile
ALTER TABLE public.display_ad_campaigns
ADD COLUMN IF NOT EXISTS countdown_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS countdown_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS countdown_text TEXT DEFAULT 'Offerta valida ancora',
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS qr_destination_url TEXT,
ADD COLUMN IF NOT EXISTS qr_enabled BOOLEAN DEFAULT false;

-- Tabella per tracciare le scansioni QR
CREATE TABLE IF NOT EXISTS public.ad_qr_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.display_ad_campaigns(id) ON DELETE CASCADE,
  corner_id UUID REFERENCES public.corners(id),
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  referrer TEXT
);

-- Abilita RLS
ALTER TABLE public.ad_qr_scans ENABLE ROW LEVEL SECURITY;

-- Policy per inserimento pubblico (tracciamento scansioni)
CREATE POLICY "Anyone can insert qr scans"
ON public.ad_qr_scans
FOR INSERT
WITH CHECK (true);

-- Policy per visualizzazione da parte dell'inserzionista
CREATE POLICY "Advertisers can view their campaign scans"
ON public.ad_qr_scans
FOR SELECT
USING (
  campaign_id IN (
    SELECT id FROM public.display_ad_campaigns 
    WHERE advertiser_email = (auth.jwt() ->> 'email')
  )
);

-- Policy per platform admin
CREATE POLICY "Platform admins can manage all qr scans"
ON public.ad_qr_scans
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_ad_qr_scans_campaign ON public.ad_qr_scans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_qr_scans_scanned_at ON public.ad_qr_scans(scanned_at);