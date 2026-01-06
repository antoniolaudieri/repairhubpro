-- Add SMTP config and marketing sender fields to marketing_automation_settings
ALTER TABLE public.marketing_automation_settings
ADD COLUMN IF NOT EXISTS smtp_config jsonb DEFAULT null,
ADD COLUMN IF NOT EXISTS marketing_sender_name text DEFAULT 'Riccardo C. - LinkRiparo',
ADD COLUMN IF NOT EXISTS marketing_sender_email text DEFAULT null,
ADD COLUMN IF NOT EXISTS physical_address text DEFAULT 'Via Example 123, 00100 Roma RM';

-- Add marketing unsubscribe tracking to marketing_leads
ALTER TABLE public.marketing_leads
ADD COLUMN IF NOT EXISTS unsubscribed_at timestamp with time zone DEFAULT null,
ADD COLUMN IF NOT EXISTS unsubscribed_reason text DEFAULT null;

-- Create marketing_unsubscribes table for marketing leads
CREATE TABLE IF NOT EXISTS public.marketing_unsubscribes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  lead_id uuid REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  reason text,
  unsubscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS marketing_unsubscribes_email_idx ON public.marketing_unsubscribes(email);

-- Enable RLS on marketing_unsubscribes
ALTER TABLE public.marketing_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (used by edge functions)
CREATE POLICY "Service role full access on marketing_unsubscribes"
ON public.marketing_unsubscribes
FOR ALL
USING (true)
WITH CHECK (true);