-- Create enum for movement types
CREATE TYPE financial_movement_type AS ENUM ('income', 'expense');

-- Create table for financial movements
CREATE TABLE public.centro_financial_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  type financial_movement_type NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  reference_id UUID, -- Can reference repair_id, quote_id, etc.
  reference_type TEXT, -- 'repair', 'quote', 'used_device', 'loyalty_card', 'manual'
  receipt_url TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT, -- 'monthly', 'quarterly', 'yearly'
  tags TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for custom categories
CREATE TABLE public.centro_financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  type financial_movement_type NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centro_id, type, name)
);

-- Enable RLS
ALTER TABLE public.centro_financial_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centro_financial_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for movements
CREATE POLICY "Centro owners can manage their movements"
ON public.centro_financial_movements FOR ALL
USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Centro collaborators can view movements"
ON public.centro_financial_movements FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all movements"
ON public.centro_financial_movements FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS policies for categories
CREATE POLICY "Centro owners can manage their categories"
ON public.centro_financial_categories FOR ALL
USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Centro collaborators can view categories"
ON public.centro_financial_categories FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all categories"
ON public.centro_financial_categories FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_centro_financial_movements_centro_id ON public.centro_financial_movements(centro_id);
CREATE INDEX idx_centro_financial_movements_date ON public.centro_financial_movements(movement_date);
CREATE INDEX idx_centro_financial_movements_type ON public.centro_financial_movements(type);
CREATE INDEX idx_centro_financial_movements_category ON public.centro_financial_movements(category);

-- Trigger for updated_at
CREATE TRIGGER update_centro_financial_movements_updated_at
BEFORE UPDATE ON public.centro_financial_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();