
-- Step 1: Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'corner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'riparatore';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'centro_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'centro_tech';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- Step 2: Create corners table (Negozi Segnalatori)
CREATE TABLE public.corners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Create riparatori table (Tecnici Indipendenti)
CREATE TABLE public.riparatori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC NOT NULL DEFAULT 15,
  commission_rate NUMERIC NOT NULL DEFAULT 60,
  is_mobile BOOLEAN NOT NULL DEFAULT true,
  specializations JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Create centri_assistenza table (Centri con Sede Fisica)
CREATE TABLE public.centri_assistenza (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  vat_number TEXT,
  address TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 70,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 5: Create centro_collaboratori table (Dipendenti/Collaboratori dei Centri)
CREATE TABLE public.centro_collaboratori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE NOT NULL,
  riparatore_id UUID REFERENCES public.riparatori(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'collaborator')),
  commission_share NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT centro_collaboratori_user_check CHECK (riparatore_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Step 6: Create corner_partnerships table (Associazioni Corner ↔ Provider)
CREATE TABLE public.corner_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corner_id UUID REFERENCES public.corners(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('centro', 'riparatore')),
  provider_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(corner_id, provider_type, provider_id)
);

-- Step 7: Enable RLS on all new tables
ALTER TABLE public.corners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riparatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centri_assistenza ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centro_collaboratori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corner_partnerships ENABLE ROW LEVEL SECURITY;

-- Step 8: Create helper function to check platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'platform_admin'
  )
$$;

-- Step 9: RLS Policies for corners
CREATE POLICY "Platform admins can manage all corners"
ON public.corners FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Corner owners can view own record"
ON public.corners FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Corner owners can update own record"
ON public.corners FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert corner registration"
ON public.corners FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Step 10: RLS Policies for riparatori
CREATE POLICY "Platform admins can manage all riparatori"
ON public.riparatori FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Riparatori can view own record"
ON public.riparatori FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Riparatori can update own record"
ON public.riparatori FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert riparatore registration"
ON public.riparatori FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Approved riparatori are visible to corners and centri for partnership
CREATE POLICY "Approved riparatori visible to corners and centri"
ON public.riparatori FOR SELECT
USING (
  status = 'approved' AND (
    public.has_role(auth.uid(), 'corner') OR
    public.has_role(auth.uid(), 'centro_admin')
  )
);

-- Step 11: RLS Policies for centri_assistenza
CREATE POLICY "Platform admins can manage all centri"
ON public.centri_assistenza FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Centro owners can view own record"
ON public.centri_assistenza FOR SELECT
USING (owner_user_id = auth.uid());

CREATE POLICY "Centro owners can update own record"
ON public.centri_assistenza FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Anyone can insert centro registration"
ON public.centri_assistenza FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Approved centri are visible to corners for partnership
CREATE POLICY "Approved centri visible to corners"
ON public.centri_assistenza FOR SELECT
USING (
  status = 'approved' AND public.has_role(auth.uid(), 'corner')
);

-- Centro techs can view their centro
CREATE POLICY "Centro techs can view their centro"
ON public.centri_assistenza FOR SELECT
USING (
  id IN (
    SELECT centro_id FROM public.centro_collaboratori 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Step 12: RLS Policies for centro_collaboratori
CREATE POLICY "Platform admins can manage all collaboratori"
ON public.centro_collaboratori FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Centro admins can manage their collaboratori"
ON public.centro_collaboratori FOR ALL
USING (
  centro_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Collaboratori can view own record"
ON public.centro_collaboratori FOR SELECT
USING (user_id = auth.uid() OR riparatore_id IN (
  SELECT id FROM public.riparatori WHERE user_id = auth.uid()
));

-- Step 13: RLS Policies for corner_partnerships
CREATE POLICY "Platform admins can manage all partnerships"
ON public.corner_partnerships FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Corner owners can manage their partnerships"
ON public.corner_partnerships FOR ALL
USING (
  corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid())
);

CREATE POLICY "Providers can view partnerships they're part of"
ON public.corner_partnerships FOR SELECT
USING (
  (provider_type = 'riparatore' AND provider_id IN (
    SELECT id FROM public.riparatori WHERE user_id = auth.uid()
  )) OR
  (provider_type = 'centro' AND provider_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

-- Step 14: Create updated_at triggers for new tables
CREATE TRIGGER update_corners_updated_at
BEFORE UPDATE ON public.corners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_riparatori_updated_at
BEFORE UPDATE ON public.riparatori
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_centri_assistenza_updated_at
BEFORE UPDATE ON public.centri_assistenza
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_centro_collaboratori_updated_at
BEFORE UPDATE ON public.centro_collaboratori
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_corner_partnerships_updated_at
BEFORE UPDATE ON public.corner_partnerships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 15: Create indexes for performance
CREATE INDEX idx_corners_user_id ON public.corners(user_id);
CREATE INDEX idx_corners_status ON public.corners(status);
CREATE INDEX idx_corners_location ON public.corners(latitude, longitude);

CREATE INDEX idx_riparatori_user_id ON public.riparatori(user_id);
CREATE INDEX idx_riparatori_status ON public.riparatori(status);
CREATE INDEX idx_riparatori_location ON public.riparatori(latitude, longitude);

CREATE INDEX idx_centri_assistenza_owner ON public.centri_assistenza(owner_user_id);
CREATE INDEX idx_centri_assistenza_status ON public.centri_assistenza(status);
CREATE INDEX idx_centri_assistenza_location ON public.centri_assistenza(latitude, longitude);

CREATE INDEX idx_centro_collaboratori_centro ON public.centro_collaboratori(centro_id);
CREATE INDEX idx_centro_collaboratori_riparatore ON public.centro_collaboratori(riparatore_id);

CREATE INDEX idx_corner_partnerships_corner ON public.corner_partnerships(corner_id);
CREATE INDEX idx_corner_partnerships_provider ON public.corner_partnerships(provider_type, provider_id);
