-- Enable technicians and admins to delete repair parts
CREATE POLICY "Technicians and admins can delete repair_parts"
ON public.repair_parts
FOR DELETE
USING (
  has_role(auth.uid(), 'technician'::text) OR 
  has_role(auth.uid(), 'admin'::text)
);