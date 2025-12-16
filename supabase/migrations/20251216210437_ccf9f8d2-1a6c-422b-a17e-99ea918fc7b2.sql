-- Create centro_promos table for promotional offers
CREATE TABLE public.centro_promos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'repairs', 'diagnostics', 'loyalty_members')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.centro_promos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Centro owners can manage their promos"
ON public.centro_promos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.centri_assistenza
    WHERE id = centro_promos.centro_id
    AND owner_user_id = auth.uid()
  )
);

CREATE POLICY "Platform admins can view all promos"
ON public.centro_promos
FOR SELECT
USING (public.is_platform_admin(auth.uid()));

-- Update trigger
CREATE TRIGGER update_centro_promos_updated_at
BEFORE UPDATE ON public.centro_promos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();