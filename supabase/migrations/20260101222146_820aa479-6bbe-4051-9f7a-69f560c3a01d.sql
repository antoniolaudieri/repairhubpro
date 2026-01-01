-- Create revenue_opportunities_log table to track actions on opportunities
CREATE TABLE public.revenue_opportunities_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  opportunity_type TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  actual_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  contacted_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_revenue_opportunities_centro ON public.revenue_opportunities_log(centro_id);
CREATE INDEX idx_revenue_opportunities_customer ON public.revenue_opportunities_log(customer_id);
CREATE INDEX idx_revenue_opportunities_status ON public.revenue_opportunities_log(status);
CREATE INDEX idx_revenue_opportunities_type ON public.revenue_opportunities_log(opportunity_type);

-- Enable RLS
ALTER TABLE public.revenue_opportunities_log ENABLE ROW LEVEL SECURITY;

-- Centro owners can manage their opportunities
CREATE POLICY "Centro owners can manage their opportunities"
ON public.revenue_opportunities_log
FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Centro collaborators can view opportunities
CREATE POLICY "Centro collaborators can view opportunities"
ON public.revenue_opportunities_log
FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

-- Platform admins can manage all opportunities
CREATE POLICY "Platform admins can manage all opportunities"
ON public.revenue_opportunities_log
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_revenue_opportunities_log_updated_at
BEFORE UPDATE ON public.revenue_opportunities_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();