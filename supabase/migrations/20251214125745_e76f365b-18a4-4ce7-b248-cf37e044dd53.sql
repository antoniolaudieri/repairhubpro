-- Tabella campagne pubblicitarie display
CREATE TABLE public.display_ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_name TEXT NOT NULL,
  advertiser_email TEXT NOT NULL,
  advertiser_phone TEXT,
  advertiser_company TEXT,
  
  -- Creatività
  ad_title TEXT NOT NULL,
  ad_description TEXT,
  ad_image_url TEXT,
  ad_gradient TEXT DEFAULT 'from-blue-600 via-purple-600 to-pink-600',
  ad_icon TEXT DEFAULT 'Megaphone',
  ad_type TEXT NOT NULL DEFAULT 'gradient',
  
  -- Periodo
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Pricing
  total_price NUMERIC NOT NULL DEFAULT 0,
  platform_revenue NUMERIC NOT NULL DEFAULT 0,
  corner_revenue_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Stato
  status TEXT NOT NULL DEFAULT 'pending_payment',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  paid_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabella assegnazioni campagna -> corner
CREATE TABLE public.display_ad_campaign_corners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.display_ad_campaigns(id) ON DELETE CASCADE,
  corner_id UUID NOT NULL REFERENCES public.corners(id) ON DELETE CASCADE,
  corner_revenue NUMERIC NOT NULL DEFAULT 0,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggiungi settings per tariffe pubblicitarie
INSERT INTO public.platform_settings (key, label, value, min_value, max_value, description)
VALUES 
  ('ad_price_per_corner_per_week', 'Prezzo per Corner/Settimana (€)', 5, 1, 100, 'Prezzo base per mostrare una pubblicità su un Corner per una settimana'),
  ('ad_corner_revenue_percentage', 'Percentuale Corner (%)', 50, 0, 100, 'Percentuale del ricavo pubblicitario riconosciuta al Corner');

-- Abilita RLS
ALTER TABLE public.display_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_ad_campaign_corners ENABLE ROW LEVEL SECURITY;

-- Policies per display_ad_campaigns
CREATE POLICY "Anyone can insert campaigns" 
ON public.display_ad_campaigns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view active campaigns" 
ON public.display_ad_campaigns 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Advertisers can view own campaigns" 
ON public.display_ad_campaigns 
FOR SELECT 
USING (advertiser_email = (auth.jwt() ->> 'email'::text));

CREATE POLICY "Platform admins can manage all campaigns" 
ON public.display_ad_campaigns 
FOR ALL 
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Corners can view campaigns on their display" 
ON public.display_ad_campaigns 
FOR SELECT 
USING (
  status = 'active' AND 
  id IN (
    SELECT campaign_id FROM public.display_ad_campaign_corners 
    WHERE corner_id IN (
      SELECT id FROM public.corners WHERE user_id = auth.uid()
    )
  )
);

-- Policies per display_ad_campaign_corners
CREATE POLICY "Anyone can view active campaign corners" 
ON public.display_ad_campaign_corners 
FOR SELECT 
USING (
  campaign_id IN (
    SELECT id FROM public.display_ad_campaigns WHERE status = 'active'
  )
);

CREATE POLICY "Platform admins can manage all campaign corners" 
ON public.display_ad_campaign_corners 
FOR ALL 
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Corners can view their campaign assignments" 
ON public.display_ad_campaign_corners 
FOR SELECT 
USING (
  corner_id IN (
    SELECT id FROM public.corners WHERE user_id = auth.uid()
  )
);

-- Trigger per updated_at
CREATE TRIGGER update_display_ad_campaigns_updated_at
BEFORE UPDATE ON public.display_ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crea storage bucket per immagini ads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ad-creatives', 'ad-creatives', true)
ON CONFLICT (id) DO NOTHING;

-- Policy storage per upload pubbliche
CREATE POLICY "Anyone can upload ad creatives"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-creatives');

CREATE POLICY "Anyone can view ad creatives"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-creatives');