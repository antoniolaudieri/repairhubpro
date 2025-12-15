-- Create customer_communications table for tracking all communications
CREATE TABLE public.customer_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'email', -- 'email', 'note', 'sms'
  subject TEXT,
  content TEXT,
  template_name TEXT, -- e.g., 'quote_sent', 'status_update', 'welcome', etc.
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'opened'
  metadata JSONB DEFAULT '{}'::jsonb, -- for additional data like repair_id, quote_id, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_customer_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX idx_customer_communications_centro_id ON public.customer_communications(centro_id);
CREATE INDEX idx_customer_communications_created_at ON public.customer_communications(created_at DESC);

-- Enable RLS
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

-- Centro admins can manage their communications
CREATE POLICY "Centro admins can manage their communications"
ON public.customer_communications
FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Centro collaborators can view communications
CREATE POLICY "Centro collaborators can view communications"
ON public.customer_communications
FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

-- Platform admins can manage all communications
CREATE POLICY "Platform admins can manage all communications"
ON public.customer_communications
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Customers can view their own communications
CREATE POLICY "Customers can view own communications"
ON public.customer_communications
FOR SELECT
USING (customer_id IN (
  SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email'::text)
));

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_communications;