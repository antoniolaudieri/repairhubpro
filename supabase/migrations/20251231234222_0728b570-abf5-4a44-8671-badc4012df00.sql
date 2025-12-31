
-- Create whatsapp_campaigns table
CREATE TABLE public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Create whatsapp_campaign_recipients table
CREATE TABLE public.whatsapp_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  personalized_message TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create whatsapp_message_templates table for reusable templates
CREATE TABLE public.whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_campaigns
CREATE POLICY "Centro owners can manage their campaigns"
ON public.whatsapp_campaigns FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro collaborators can view campaigns"
ON public.whatsapp_campaigns FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all campaigns"
ON public.whatsapp_campaigns FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS policies for whatsapp_campaign_recipients
CREATE POLICY "Centro owners can manage their campaign recipients"
ON public.whatsapp_campaign_recipients FOR ALL
USING (campaign_id IN (
  SELECT id FROM whatsapp_campaigns WHERE centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
))
WITH CHECK (campaign_id IN (
  SELECT id FROM whatsapp_campaigns WHERE centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
));

CREATE POLICY "Centro collaborators can view campaign recipients"
ON public.whatsapp_campaign_recipients FOR SELECT
USING (campaign_id IN (
  SELECT id FROM whatsapp_campaigns WHERE is_centro_collaborator(auth.uid(), centro_id)
));

CREATE POLICY "Platform admins can manage all campaign recipients"
ON public.whatsapp_campaign_recipients FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS policies for whatsapp_message_templates
CREATE POLICY "Centro owners can manage their templates"
ON public.whatsapp_message_templates FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro collaborators can view templates"
ON public.whatsapp_message_templates FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all templates"
ON public.whatsapp_message_templates FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_campaigns_centro_id ON public.whatsapp_campaigns(centro_id);
CREATE INDEX idx_whatsapp_campaign_recipients_campaign_id ON public.whatsapp_campaign_recipients(campaign_id);
CREATE INDEX idx_whatsapp_campaign_recipients_customer_id ON public.whatsapp_campaign_recipients(customer_id);
CREATE INDEX idx_whatsapp_message_templates_centro_id ON public.whatsapp_message_templates(centro_id);
