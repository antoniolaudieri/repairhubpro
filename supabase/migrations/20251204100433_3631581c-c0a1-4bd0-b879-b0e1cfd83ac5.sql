-- Allow Corners to search customers by phone (to check if customer exists)
CREATE POLICY "Corners can search customers by phone"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'corner'));