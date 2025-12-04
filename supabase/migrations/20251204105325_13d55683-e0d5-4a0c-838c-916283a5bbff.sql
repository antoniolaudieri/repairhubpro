-- Add RLS policy for Centro admins to create quotes
CREATE POLICY "Centro admins can create quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'centro_admin'::text));

-- Add RLS policy for Centro admins to read quotes
CREATE POLICY "Centro admins can read quotes" 
ON public.quotes 
FOR SELECT 
USING (has_role(auth.uid(), 'centro_admin'::text));

-- Add RLS policy for Centro admins to update quotes
CREATE POLICY "Centro admins can update quotes" 
ON public.quotes 
FOR UPDATE 
USING (has_role(auth.uid(), 'centro_admin'::text));