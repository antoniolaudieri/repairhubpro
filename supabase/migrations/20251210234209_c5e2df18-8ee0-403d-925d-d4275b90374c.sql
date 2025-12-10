-- Allow Centro admins to delete their quotes
CREATE POLICY "Centro admins can delete their quotes"
ON public.quotes
FOR DELETE
USING (
  customer_id IN (
    SELECT c.id FROM customers c
    WHERE c.centro_id = get_user_centro_id(auth.uid())
  )
  OR
  created_by = auth.uid()
);