-- Add DELETE policy for spare_parts table
CREATE POLICY "Technicians and admins can delete spare_parts"
ON public.spare_parts
FOR DELETE
USING (has_role(auth.uid(), 'technician'::text) OR has_role(auth.uid(), 'admin'::text));
