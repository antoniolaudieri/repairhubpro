-- Create table for storing repair guides
CREATE TABLE public.repair_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  guide_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create unique index for device + issue combination
CREATE UNIQUE INDEX idx_repair_guides_device_issue 
ON public.repair_guides(device_brand, device_model, issue_category);

-- Create index for searching
CREATE INDEX idx_repair_guides_search 
ON public.repair_guides(device_brand, device_model, device_type);

-- Enable RLS
ALTER TABLE public.repair_guides ENABLE ROW LEVEL SECURITY;

-- Technicians and admins can read all guides
CREATE POLICY "Technicians and admins can read repair_guides"
ON public.repair_guides
FOR SELECT
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can insert guides
CREATE POLICY "Technicians and admins can insert repair_guides"
ON public.repair_guides
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can update guides
CREATE POLICY "Technicians and admins can update repair_guides"
ON public.repair_guides
FOR UPDATE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Technicians and admins can delete guides
CREATE POLICY "Technicians and admins can delete repair_guides"
ON public.repair_guides
FOR DELETE
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_repair_guides_updated_at
BEFORE UPDATE ON public.repair_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();