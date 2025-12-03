
-- Step 1: Create repair_requests table (Richieste di Riparazione - Sistema Dispatch)
CREATE TABLE public.repair_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  corner_id UUID REFERENCES public.corners(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL,
  device_brand TEXT,
  device_model TEXT,
  issue_description TEXT NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  customer_latitude NUMERIC,
  customer_longitude NUMERIC,
  service_type TEXT NOT NULL DEFAULT 'corner' CHECK (service_type IN ('corner', 'domicilio', 'sede')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispatching', 'assigned', 'in_progress', 'completed', 'cancelled')),
  estimated_cost NUMERIC,
  assigned_provider_type TEXT CHECK (assigned_provider_type IN ('centro', 'riparatore')),
  assigned_provider_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Create job_offers table (Offerte ai Provider - Stile Deliveroo)
CREATE TABLE public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id UUID REFERENCES public.repair_requests(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('centro', 'riparatore')),
  provider_id UUID NOT NULL,
  distance_km NUMERIC,
  offered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create commission_ledger table (Registro Commissioni)
CREATE TABLE public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID REFERENCES public.repairs(id) ON DELETE CASCADE,
  repair_request_id UUID REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  gross_revenue NUMERIC NOT NULL,
  parts_cost NUMERIC NOT NULL DEFAULT 0,
  gross_margin NUMERIC NOT NULL,
  platform_commission NUMERIC NOT NULL,
  platform_rate NUMERIC NOT NULL DEFAULT 20,
  corner_commission NUMERIC DEFAULT 0,
  corner_rate NUMERIC DEFAULT 10,
  corner_id UUID REFERENCES public.corners(id) ON DELETE SET NULL,
  riparatore_commission NUMERIC DEFAULT 0,
  riparatore_rate NUMERIC DEFAULT 60,
  riparatore_id UUID REFERENCES public.riparatori(id) ON DELETE SET NULL,
  centro_commission NUMERIC DEFAULT 0,
  centro_rate NUMERIC,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  stripe_transfer_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Create inventory_access table (Accesso Inventario Condiviso)
CREATE TABLE public.inventory_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  riparatore_id UUID REFERENCES public.riparatori(id) ON DELETE CASCADE NOT NULL,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_reserve BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(riparatore_id, centro_id)
);

-- Step 5: Add centro_id to spare_parts for multi-tenant inventory
ALTER TABLE public.spare_parts ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_spare_parts_centro ON public.spare_parts(centro_id);

-- Step 6: Enable RLS on new tables
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_access ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for repair_requests
CREATE POLICY "Platform admins can manage all repair_requests"
ON public.repair_requests FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Corners can view their repair_requests"
ON public.repair_requests FOR SELECT
USING (corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()));

CREATE POLICY "Corners can create repair_requests"
ON public.repair_requests FOR INSERT
WITH CHECK (
  corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()) OR
  corner_id IS NULL
);

CREATE POLICY "Assigned providers can view their repair_requests"
ON public.repair_requests FOR SELECT
USING (
  (assigned_provider_type = 'riparatore' AND assigned_provider_id IN (
    SELECT id FROM public.riparatori WHERE user_id = auth.uid()
  )) OR
  (assigned_provider_type = 'centro' AND assigned_provider_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

CREATE POLICY "Assigned providers can update their repair_requests"
ON public.repair_requests FOR UPDATE
USING (
  (assigned_provider_type = 'riparatore' AND assigned_provider_id IN (
    SELECT id FROM public.riparatori WHERE user_id = auth.uid()
  )) OR
  (assigned_provider_type = 'centro' AND assigned_provider_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

-- Step 8: RLS Policies for job_offers
CREATE POLICY "Platform admins can manage all job_offers"
ON public.job_offers FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Providers can view their job_offers"
ON public.job_offers FOR SELECT
USING (
  (provider_type = 'riparatore' AND provider_id IN (
    SELECT id FROM public.riparatori WHERE user_id = auth.uid()
  )) OR
  (provider_type = 'centro' AND provider_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

CREATE POLICY "Providers can update their job_offers"
ON public.job_offers FOR UPDATE
USING (
  (provider_type = 'riparatore' AND provider_id IN (
    SELECT id FROM public.riparatori WHERE user_id = auth.uid()
  )) OR
  (provider_type = 'centro' AND provider_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

-- Step 9: RLS Policies for commission_ledger
CREATE POLICY "Platform admins can manage all commissions"
ON public.commission_ledger FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Corners can view their commissions"
ON public.commission_ledger FOR SELECT
USING (corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()));

CREATE POLICY "Riparatori can view their commissions"
ON public.commission_ledger FOR SELECT
USING (riparatore_id IN (SELECT id FROM public.riparatori WHERE user_id = auth.uid()));

CREATE POLICY "Centri can view their commissions"
ON public.commission_ledger FOR SELECT
USING (centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()));

-- Step 10: RLS Policies for inventory_access
CREATE POLICY "Platform admins can manage all inventory_access"
ON public.inventory_access FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Centri can manage their inventory_access"
ON public.inventory_access FOR ALL
USING (centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Riparatori can view their inventory_access"
ON public.inventory_access FOR SELECT
USING (riparatore_id IN (SELECT id FROM public.riparatori WHERE user_id = auth.uid()));

-- Step 11: Update spare_parts RLS for multi-tenant
CREATE POLICY "Riparatori can view shared inventory"
ON public.spare_parts FOR SELECT
USING (
  centro_id IN (
    SELECT ia.centro_id FROM public.inventory_access ia
    JOIN public.riparatori r ON r.id = ia.riparatore_id
    WHERE r.user_id = auth.uid() AND ia.can_view = true AND ia.is_active = true
  )
);

CREATE POLICY "Centro admins can manage their inventory"
ON public.spare_parts FOR ALL
USING (
  centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid())
);

-- Step 12: Create triggers for updated_at
CREATE TRIGGER update_repair_requests_updated_at
BEFORE UPDATE ON public.repair_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_ledger_updated_at
BEFORE UPDATE ON public.commission_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_access_updated_at
BEFORE UPDATE ON public.inventory_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 13: Create indexes for performance
CREATE INDEX idx_repair_requests_customer ON public.repair_requests(customer_id);
CREATE INDEX idx_repair_requests_corner ON public.repair_requests(corner_id);
CREATE INDEX idx_repair_requests_status ON public.repair_requests(status);
CREATE INDEX idx_repair_requests_assigned ON public.repair_requests(assigned_provider_type, assigned_provider_id);

CREATE INDEX idx_job_offers_request ON public.job_offers(repair_request_id);
CREATE INDEX idx_job_offers_provider ON public.job_offers(provider_type, provider_id);
CREATE INDEX idx_job_offers_status ON public.job_offers(status);

CREATE INDEX idx_commission_ledger_repair ON public.commission_ledger(repair_id);
CREATE INDEX idx_commission_ledger_corner ON public.commission_ledger(corner_id);
CREATE INDEX idx_commission_ledger_riparatore ON public.commission_ledger(riparatore_id);
CREATE INDEX idx_commission_ledger_centro ON public.commission_ledger(centro_id);
CREATE INDEX idx_commission_ledger_status ON public.commission_ledger(status);

CREATE INDEX idx_inventory_access_riparatore ON public.inventory_access(riparatore_id);
CREATE INDEX idx_inventory_access_centro ON public.inventory_access(centro_id);
