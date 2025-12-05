-- Create repair checklists table
CREATE TABLE public.repair_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_id UUID REFERENCES public.repairs(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('pre_repair', 'post_repair')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  customer_signature TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create checklist items table
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.repair_checklists(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'damaged', 'not_working', 'not_applicable')),
  notes TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist templates table for reusable templates
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default checklist items for smartphones
INSERT INTO public.checklist_templates (device_type, category, item_name, sort_order) VALUES
  ('smartphone', 'Estetica', 'Schermo (graffi, crepe)', 1),
  ('smartphone', 'Estetica', 'Back cover', 2),
  ('smartphone', 'Estetica', 'Cornice laterale', 3),
  ('smartphone', 'Estetica', 'Fotocamera posteriore', 4),
  ('smartphone', 'Estetica', 'Fotocamera frontale', 5),
  ('smartphone', 'Funzionalità', 'Touch screen', 10),
  ('smartphone', 'Funzionalità', 'Display (colori, pixel morti)', 11),
  ('smartphone', 'Funzionalità', 'Altoparlante', 12),
  ('smartphone', 'Funzionalità', 'Microfono', 13),
  ('smartphone', 'Funzionalità', 'Tasti volume', 14),
  ('smartphone', 'Funzionalità', 'Tasto accensione', 15),
  ('smartphone', 'Funzionalità', 'Ricarica', 16),
  ('smartphone', 'Funzionalità', 'Face ID / Touch ID', 17),
  ('smartphone', 'Funzionalità', 'WiFi', 18),
  ('smartphone', 'Funzionalità', 'Bluetooth', 19),
  ('smartphone', 'Funzionalità', 'GPS', 20),
  ('smartphone', 'Funzionalità', 'Vibrazione', 21),
  ('smartphone', 'Funzionalità', 'Flash', 22),
  ('smartphone', 'Batteria', 'Stato batteria', 30),
  ('smartphone', 'Batteria', 'Ricarica wireless', 31),
  ('smartphone', 'Accessori', 'SIM tray presente', 40),
  ('smartphone', 'Accessori', 'Cover/custodia', 41),
  ('smartphone', 'Accessori', 'Pellicola protettiva', 42);

-- Insert default checklist items for tablets
INSERT INTO public.checklist_templates (device_type, category, item_name, sort_order) VALUES
  ('tablet', 'Estetica', 'Schermo (graffi, crepe)', 1),
  ('tablet', 'Estetica', 'Back cover', 2),
  ('tablet', 'Estetica', 'Cornice', 3),
  ('tablet', 'Funzionalità', 'Touch screen', 10),
  ('tablet', 'Funzionalità', 'Display', 11),
  ('tablet', 'Funzionalità', 'Altoparlanti', 12),
  ('tablet', 'Funzionalità', 'Microfono', 13),
  ('tablet', 'Funzionalità', 'Tasti', 14),
  ('tablet', 'Funzionalità', 'Ricarica', 15),
  ('tablet', 'Funzionalità', 'WiFi', 16),
  ('tablet', 'Funzionalità', 'Bluetooth', 17),
  ('tablet', 'Batteria', 'Stato batteria', 30);

-- Insert default checklist items for laptops
INSERT INTO public.checklist_templates (device_type, category, item_name, sort_order) VALUES
  ('laptop', 'Estetica', 'Schermo', 1),
  ('laptop', 'Estetica', 'Scocca superiore', 2),
  ('laptop', 'Estetica', 'Scocca inferiore', 3),
  ('laptop', 'Estetica', 'Cerniere', 4),
  ('laptop', 'Funzionalità', 'Display', 10),
  ('laptop', 'Funzionalità', 'Tastiera', 11),
  ('laptop', 'Funzionalità', 'Trackpad', 12),
  ('laptop', 'Funzionalità', 'Webcam', 13),
  ('laptop', 'Funzionalità', 'Altoparlanti', 14),
  ('laptop', 'Funzionalità', 'Microfono', 15),
  ('laptop', 'Funzionalità', 'USB ports', 16),
  ('laptop', 'Funzionalità', 'HDMI/DisplayPort', 17),
  ('laptop', 'Funzionalità', 'WiFi', 18),
  ('laptop', 'Funzionalità', 'Bluetooth', 19),
  ('laptop', 'Batteria', 'Stato batteria', 30),
  ('laptop', 'Batteria', 'Caricatore', 31);

-- Enable RLS
ALTER TABLE public.repair_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repair_checklists
CREATE POLICY "Technicians can manage checklists" ON public.repair_checklists
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('technician', 'admin', 'platform_admin', 'centro_admin', 'centro_tech'))
  );

CREATE POLICY "Customers can view their checklists" ON public.repair_checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repairs r
      JOIN devices d ON r.device_id = d.id
      JOIN customers c ON d.customer_id = c.id
      WHERE r.id = repair_id AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policies for checklist_items
CREATE POLICY "Technicians can manage checklist items" ON public.checklist_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('technician', 'admin', 'platform_admin', 'centro_admin', 'centro_tech'))
  );

CREATE POLICY "Customers can view their checklist items" ON public.checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repair_checklists rc
      JOIN repairs r ON rc.repair_id = r.id
      JOIN devices d ON r.device_id = d.id
      JOIN customers c ON d.customer_id = c.id
      WHERE rc.id = checklist_id AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- RLS Policy for templates (readable by all authenticated)
CREATE POLICY "Anyone can read templates" ON public.checklist_templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage templates" ON public.checklist_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'platform_admin'))
  );