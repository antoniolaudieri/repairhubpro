-- Create loyalty_program_settings table for per-Centro customization
CREATE TABLE public.loyalty_program_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  annual_price NUMERIC NOT NULL DEFAULT 30,
  diagnostic_fee NUMERIC NOT NULL DEFAULT 10,
  repair_discount_percent NUMERIC NOT NULL DEFAULT 10,
  max_devices INTEGER NOT NULL DEFAULT 3,
  validity_months INTEGER NOT NULL DEFAULT 12,
  card_background_url TEXT,
  card_accent_color TEXT DEFAULT '#f59e0b',
  card_text_color TEXT DEFAULT '#ffffff',
  card_template TEXT DEFAULT 'gold',
  promo_tagline TEXT DEFAULT 'Cliente Fedeltà',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centro_id)
);

-- Enable RLS
ALTER TABLE public.loyalty_program_settings ENABLE ROW LEVEL SECURITY;

-- Centro owners can manage their own settings
CREATE POLICY "Centro owners can manage their loyalty settings"
ON public.loyalty_program_settings
FOR ALL
USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

-- Platform admins can manage all settings
CREATE POLICY "Platform admins can manage all loyalty settings"
ON public.loyalty_program_settings
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Anyone can read active settings (for customer display)
CREATE POLICY "Anyone can read active loyalty settings"
ON public.loyalty_program_settings
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_loyalty_program_settings_updated_at
BEFORE UPDATE ON public.loyalty_program_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();