-- Create enum for device condition
CREATE TYPE public.device_condition AS ENUM ('ricondizionato', 'usato_ottimo', 'usato_buono', 'usato_discreto', 'alienato');

-- Create enum for device source
CREATE TYPE public.device_source AS ENUM ('riparazione_alienata', 'permuta', 'acquisto', 'ricondizionato');

-- Create used_devices table
CREATE TABLE public.used_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE NOT NULL,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT,
  storage_capacity TEXT,
  condition device_condition NOT NULL DEFAULT 'usato_buono',
  price NUMERIC NOT NULL,
  original_price NUMERIC,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  warranty_months INTEGER DEFAULT 0,
  source device_source NOT NULL DEFAULT 'acquisto',
  repair_id UUID REFERENCES public.repairs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  sold_at TIMESTAMP WITH TIME ZONE,
  reserved_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create used_device_interests table for notification preferences
CREATE TABLE public.used_device_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  device_types TEXT[] DEFAULT '{}',
  brands TEXT[] DEFAULT '{}',
  max_price NUMERIC,
  notify_enabled BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create used_device_reservations table
CREATE TABLE public.used_device_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.used_devices(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.used_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_device_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_device_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for used_devices
CREATE POLICY "Anyone can view published devices"
ON public.used_devices FOR SELECT
USING (status = 'published');

CREATE POLICY "Centro owners can manage their devices"
ON public.used_devices FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Platform admins can manage all devices"
ON public.used_devices FOR ALL
USING (is_platform_admin(auth.uid()));

-- RLS Policies for used_device_interests
CREATE POLICY "Anyone can create interest"
ON public.used_device_interests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own interests"
ON public.used_device_interests FOR SELECT
USING (
  email = (auth.jwt() ->> 'email')
  OR customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Users can update their own interests"
ON public.used_device_interests FOR UPDATE
USING (
  email = (auth.jwt() ->> 'email')
  OR customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Platform admins can view all interests"
ON public.used_device_interests FOR SELECT
USING (is_platform_admin(auth.uid()));

-- RLS Policies for used_device_reservations
CREATE POLICY "Anyone can create reservation"
ON public.used_device_reservations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own reservations"
ON public.used_device_reservations FOR SELECT
USING (customer_email = (auth.jwt() ->> 'email'));

CREATE POLICY "Centro owners can view reservations for their devices"
ON public.used_device_reservations FOR SELECT
USING (device_id IN (
  SELECT id FROM used_devices WHERE centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
));

CREATE POLICY "Centro owners can update reservations for their devices"
ON public.used_device_reservations FOR UPDATE
USING (device_id IN (
  SELECT id FROM used_devices WHERE centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
));

CREATE POLICY "Platform admins can manage all reservations"
ON public.used_device_reservations FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_used_devices_status ON public.used_devices(status);
CREATE INDEX idx_used_devices_centro ON public.used_devices(centro_id);
CREATE INDEX idx_used_devices_condition ON public.used_devices(condition);
CREATE INDEX idx_used_devices_brand ON public.used_devices(brand);
CREATE INDEX idx_used_device_interests_email ON public.used_device_interests(email);

-- Update trigger
CREATE TRIGGER update_used_devices_updated_at
BEFORE UPDATE ON public.used_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_used_device_interests_updated_at
BEFORE UPDATE ON public.used_device_interests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_used_device_reservations_updated_at
BEFORE UPDATE ON public.used_device_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.used_device_reservations;