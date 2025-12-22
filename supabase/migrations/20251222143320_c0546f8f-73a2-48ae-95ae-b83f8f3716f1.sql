-- Create email_unsubscribes table for tracking marketing unsubscriptions
CREATE TABLE public.email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centro_id, email)
);

-- Enable RLS
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policies for email_unsubscribes
CREATE POLICY "Centro owners can view their unsubscribes"
ON public.email_unsubscribes FOR SELECT
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Platform admins can manage all unsubscribes"
ON public.email_unsubscribes FOR ALL
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Service role can insert unsubscribes"
ON public.email_unsubscribes FOR INSERT
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_email_unsubscribes_email ON public.email_unsubscribes(email);
CREATE INDEX idx_email_unsubscribes_centro_id ON public.email_unsubscribes(centro_id);