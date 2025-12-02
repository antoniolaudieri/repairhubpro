-- Create table for additional services
CREATE TABLE public.additional_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.additional_services ENABLE ROW LEVEL SECURITY;

-- Technicians and admins can read services
CREATE POLICY "Technicians and admins can read additional_services"
ON public.additional_services
FOR SELECT
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can insert services
CREATE POLICY "Technicians and admins can insert additional_services"
ON public.additional_services
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can update services
CREATE POLICY "Technicians and admins can update additional_services"
ON public.additional_services
FOR UPDATE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can delete services
CREATE POLICY "Technicians and admins can delete additional_services"
ON public.additional_services
FOR DELETE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_additional_services_updated_at
BEFORE UPDATE ON public.additional_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default services
INSERT INTO public.additional_services (name, description, price, sort_order) VALUES
('Trasferimento Dati', 'Trasferimento completo dati da dispositivo a dispositivo', 25.00, 1),
('Recupero Password', 'Recupero password dispositivo bloccato', 15.00, 2),
('Backup Completo', 'Backup completo di tutti i dati su cloud o storage esterno', 20.00, 3),
('Pulizia Software', 'Rimozione virus, malware e ottimizzazione sistema', 10.00, 4),
('Applicazione Pellicola', 'Applicazione pellicola protettiva schermo', 5.00, 5),
('Pulizia Profonda', 'Pulizia interna ed esterna del dispositivo', 15.00, 6);