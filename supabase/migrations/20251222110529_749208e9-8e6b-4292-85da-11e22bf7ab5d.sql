-- Extend customers table with intelligence fields
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS ltv_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS churn_risk_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ DEFAULT now();

-- Create customer_profiles table for extended customer data
CREATE TABLE public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE NOT NULL,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE NOT NULL,
  
  -- Dati anagrafici
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'not_specified')),
  
  -- Acquisizione
  acquisition_source TEXT DEFAULT 'walk_in',
  referred_by_customer_id UUID REFERENCES public.customers(id),
  
  -- Consensi GDPR
  marketing_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  email_consent BOOLEAN DEFAULT false,
  consent_updated_at TIMESTAMPTZ,
  
  -- Preferenze
  preferred_contact_method TEXT DEFAULT 'whatsapp',
  preferred_language TEXT DEFAULT 'it',
  
  -- Comportamento
  avg_visit_duration_minutes INT,
  typical_visit_days TEXT[],
  typical_visit_time TEXT,
  
  -- Tags e interessi
  behavioral_tags TEXT[],
  device_preferences TEXT[],
  
  -- Engagement
  app_user BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  last_app_visit TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer_visits table for store visit tracking
CREATE TABLE public.customer_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE NOT NULL,
  check_in_at TIMESTAMPTZ DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  duration_minutes INT,
  visit_type TEXT DEFAULT 'repair',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_profiles
CREATE POLICY "Centro owners can manage their customer profiles"
ON public.customer_profiles
FOR ALL
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro collaborators can view customer profiles"
ON public.customer_profiles
FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all customer profiles"
ON public.customer_profiles
FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS Policies for customer_visits
CREATE POLICY "Centro owners can manage their customer visits"
ON public.customer_visits
FOR ALL
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro collaborators can view customer visits"
ON public.customer_visits
FOR SELECT
USING (is_centro_collaborator(auth.uid(), centro_id));

CREATE POLICY "Platform admins can manage all customer visits"
ON public.customer_visits
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Trigger for updated_at on customer_profiles
CREATE TRIGGER update_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for birthday queries
CREATE INDEX idx_customer_profiles_birth_date ON public.customer_profiles(birth_date);
CREATE INDEX idx_customer_profiles_centro_id ON public.customer_profiles(centro_id);
CREATE INDEX idx_customer_visits_centro_id ON public.customer_visits(centro_id);
CREATE INDEX idx_customer_visits_customer_id ON public.customer_visits(customer_id);