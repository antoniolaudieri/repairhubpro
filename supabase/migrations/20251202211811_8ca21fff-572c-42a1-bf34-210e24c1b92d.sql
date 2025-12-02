-- Create table for predefined labor prices by repair type
CREATE TABLE public.labor_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  device_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labor_prices ENABLE ROW LEVEL SECURITY;

-- Technicians and admins can read labor prices
CREATE POLICY "Technicians and admins can read labor_prices"
ON public.labor_prices
FOR SELECT
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can insert labor prices
CREATE POLICY "Technicians and admins can insert labor_prices"
ON public.labor_prices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can update labor prices
CREATE POLICY "Technicians and admins can update labor_prices"
ON public.labor_prices
FOR UPDATE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can delete labor prices
CREATE POLICY "Technicians and admins can delete labor_prices"
ON public.labor_prices
FOR DELETE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_labor_prices_updated_at
BEFORE UPDATE ON public.labor_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default labor prices
INSERT INTO public.labor_prices (name, description, price, category, device_type) VALUES
('Sostituzione Schermo', 'Riparazione display LCD/OLED', 25.00, 'display', 'smartphone'),
('Sostituzione Batteria', 'Cambio batteria con calibrazione', 15.00, 'batteria', 'smartphone'),
('Sostituzione Vetro Posteriore', 'Sostituzione back cover in vetro', 20.00, 'scocca', 'smartphone'),
('Riparazione Connettore Ricarica', 'Sostituzione porta USB-C/Lightning', 20.00, 'connettori', 'smartphone'),
('Sostituzione Fotocamera', 'Riparazione fotocamera principale o frontale', 20.00, 'fotocamera', 'smartphone'),
('Sostituzione Altoparlante', 'Cambio speaker earpiece o loudspeaker', 15.00, 'audio', 'smartphone'),
('Riparazione Scheda Madre', 'Microsaldatura e riparazione logica', 50.00, 'scheda_madre', NULL),
('Sostituzione Schermo Tablet', 'Display tablet iPad/Android', 35.00, 'display', 'tablet'),
('Sostituzione Batteria Tablet', 'Cambio batteria tablet', 20.00, 'batteria', 'tablet'),
('Sostituzione Schermo Laptop', 'Display notebook/laptop', 40.00, 'display', 'laptop'),
('Sostituzione Tastiera Laptop', 'Cambio tastiera notebook', 30.00, 'tastiera', 'laptop'),
('Pulizia Interna', 'Pulizia polvere e sostituzione pasta termica', 25.00, 'manutenzione', NULL),
('Diagnosi Avanzata', 'Analisi approfondita guasti complessi', 20.00, 'diagnosi', NULL);