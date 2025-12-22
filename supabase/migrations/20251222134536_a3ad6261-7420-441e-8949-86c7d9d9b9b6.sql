-- Create email_campaign_clicks table for tracking marketing email clicks
CREATE TABLE public.email_campaign_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL DEFAULT 'loyalty_promotion',
  email_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_campaign_clicks ENABLE ROW LEVEL SECURITY;

-- Centro owners can manage their campaign clicks
CREATE POLICY "Centro owners can manage their campaign clicks"
ON public.email_campaign_clicks
FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Platform admins can view all
CREATE POLICY "Platform admins can view all campaign clicks"
ON public.email_campaign_clicks
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Allow public insert for tracking (when customer clicks link)
CREATE POLICY "Anyone can update click tracking"
ON public.email_campaign_clicks
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_email_campaign_clicks_centro ON public.email_campaign_clicks(centro_id);
CREATE INDEX idx_email_campaign_clicks_customer ON public.email_campaign_clicks(customer_id);