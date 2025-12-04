-- Allow Corners to insert customers (without centro_id)
CREATE POLICY "Corners can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'corner') AND centro_id IS NULL);

-- Allow Corners to read customers they created via repair_requests
CREATE POLICY "Corners can read their repair request customers"
ON public.customers
FOR SELECT
USING (
  has_role(auth.uid(), 'corner') AND 
  id IN (
    SELECT customer_id FROM repair_requests 
    WHERE corner_id IN (SELECT id FROM corners WHERE user_id = auth.uid())
  )
);