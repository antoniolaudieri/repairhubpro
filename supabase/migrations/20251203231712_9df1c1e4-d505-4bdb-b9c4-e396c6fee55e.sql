-- Create platform_settings table for configurable commission rates
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL,
  label text NOT NULL,
  description text,
  min_value numeric DEFAULT 0,
  max_value numeric DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage settings
CREATE POLICY "Platform admins can manage settings"
  ON public.platform_settings
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Anyone authenticated can read settings (for commission calculations)
CREATE POLICY "Authenticated users can read settings"
  ON public.platform_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default commission rates
INSERT INTO public.platform_settings (key, value, label, description, min_value, max_value) VALUES
  ('platform_commission_rate', 20, 'Commissione Piattaforma', 'Percentuale che la piattaforma trattiene su ogni transazione', 0, 50),
  ('default_corner_commission_rate', 10, 'Commissione Corner (Default)', 'Percentuale di default per i Corner sui lavori segnalati', 0, 30),
  ('default_riparatore_commission_rate', 60, 'Commissione Riparatore (Default)', 'Percentuale di default per i Riparatori indipendenti', 0, 80),
  ('default_centro_commission_rate', 70, 'Commissione Centro (Default)', 'Percentuale di default per i Centri Assistenza', 0, 90);

-- Add trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();