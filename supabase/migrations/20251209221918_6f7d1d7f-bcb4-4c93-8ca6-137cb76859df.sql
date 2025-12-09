-- Table to store AI price valuations for market history
CREATE TABLE public.device_price_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL DEFAULT 'Smartphone',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  storage TEXT,
  original_price NUMERIC,
  grade_b NUMERIC,
  grade_a NUMERIC,
  grade_aa NUMERIC,
  grade_aaa NUMERIC,
  trend TEXT CHECK (trend IN ('alto', 'stabile', 'basso')),
  trend_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookups by device
CREATE INDEX idx_device_valuations_device ON public.device_price_valuations (brand, model, storage);
CREATE INDEX idx_device_valuations_created ON public.device_price_valuations (created_at DESC);

-- Enable RLS
ALTER TABLE public.device_price_valuations ENABLE ROW LEVEL SECURITY;

-- Centri can insert their own valuations
CREATE POLICY "Centri can insert own valuations"
ON public.device_price_valuations
FOR INSERT
WITH CHECK (
  centro_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
);

-- All authenticated users can read valuations (for market trends)
CREATE POLICY "Authenticated users can read valuations"
ON public.device_price_valuations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Platform admins can manage all
CREATE POLICY "Platform admins can manage valuations"
ON public.device_price_valuations
FOR ALL
USING (is_platform_admin(auth.uid()));