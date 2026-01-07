-- Add DELETE policy for repairs table
CREATE POLICY "Centro admins can delete repairs" 
ON public.repairs 
FOR DELETE 
USING (public.has_role(auth.uid(), 'centro_admin'));