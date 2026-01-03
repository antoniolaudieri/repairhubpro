-- Add policy for corners to view interests of customers from their partner centros
CREATE POLICY "Corners can view partner centro customer interests" 
ON public.used_device_interests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'corner'::text) AND (
    -- Allow viewing anonymous interests (no customer_id)
    customer_id IS NULL 
    OR 
    -- Allow viewing interests from customers of partner centros
    customer_id IN (
      SELECT c.id 
      FROM customers c
      WHERE c.centro_id IN (
        SELECT cp.provider_id 
        FROM corner_partnerships cp
        JOIN corners cor ON cor.id = cp.corner_id
        WHERE cor.user_id = auth.uid()
        AND cp.provider_type = 'centro'
        AND cp.is_active = true
      )
    )
  )
);