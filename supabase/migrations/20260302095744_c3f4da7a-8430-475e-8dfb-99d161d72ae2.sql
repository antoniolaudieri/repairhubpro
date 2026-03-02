
-- Create ricondizionati_campaigns table
CREATE TABLE public.ricondizionati_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  offer_text TEXT NOT NULL,
  coupon_code TEXT NOT NULL DEFAULT 'EVLZBANT',
  discount_amount NUMERIC DEFAULT 10,
  destination_url TEXT NOT NULL DEFAULT 'https://ricondizionati.evolutionlevel.it',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create ricondizionati_campaign_recipients table
CREATE TABLE public.ricondizionati_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ricondizionati_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  centro_id UUID REFERENCES centri_assistenza(id),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  tracking_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rcr_tracking ON ricondizionati_campaign_recipients(tracking_id);
CREATE INDEX idx_rcr_campaign ON ricondizionati_campaign_recipients(campaign_id);

-- Enable RLS
ALTER TABLE public.ricondizionati_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ricondizionati_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies - platform_admin only
CREATE POLICY "Platform admins can manage campaigns" ON public.ricondizionati_campaigns
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage recipients" ON public.ricondizionati_campaign_recipients
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow anon access for tracking (edge function updates via service role, but needs select for tracking_id lookup)
CREATE POLICY "Anyone can read recipient by tracking_id" ON public.ricondizionati_campaign_recipients
  FOR SELECT TO anon
  USING (true);
