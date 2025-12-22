-- Create table for device health readings from native Android app
CREATE TABLE public.device_health_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE SET NULL,
  device_token TEXT,
  
  -- Battery metrics
  battery_level INTEGER,
  battery_health TEXT,
  is_charging BOOLEAN DEFAULT false,
  
  -- Storage metrics
  storage_total_gb NUMERIC,
  storage_used_gb NUMERIC,
  storage_available_gb NUMERIC,
  storage_percent_used NUMERIC,
  
  -- RAM metrics
  ram_total_mb NUMERIC,
  ram_available_mb NUMERIC,
  ram_percent_used NUMERIC,
  
  -- Device info
  device_model TEXT,
  device_manufacturer TEXT,
  os_version TEXT,
  platform TEXT DEFAULT 'android',
  app_version TEXT,
  
  -- Calculated health score
  health_score INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_health_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Centro owners can view their readings"
ON public.device_health_readings
FOR SELECT
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro owners can manage readings"
ON public.device_health_readings
FOR ALL
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Customers can insert their readings"
ON public.device_health_readings
FOR INSERT
WITH CHECK (customer_id IN (
  SELECT id FROM public.customers WHERE email = (auth.jwt() ->> 'email')
));

CREATE POLICY "Customers can view their readings"
ON public.device_health_readings
FOR SELECT
USING (customer_id IN (
  SELECT id FROM public.customers WHERE email = (auth.jwt() ->> 'email')
));

CREATE POLICY "Platform admins can manage all readings"
ON public.device_health_readings
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_device_health_readings_centro ON public.device_health_readings(centro_id);
CREATE INDEX idx_device_health_readings_customer ON public.device_health_readings(customer_id);
CREATE INDEX idx_device_health_readings_created ON public.device_health_readings(created_at DESC);