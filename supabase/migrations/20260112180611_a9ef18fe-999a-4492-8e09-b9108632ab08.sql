
-- Drop the old case-sensitive policy
DROP POLICY IF EXISTS "customers_view_own_loyalty_cards" ON public.loyalty_cards;

-- Create a new case-insensitive policy
CREATE POLICY "customers_view_own_loyalty_cards" 
ON public.loyalty_cards 
FOR SELECT 
USING (
  customer_id IN (
    SELECT customers.id
    FROM customers
    WHERE LOWER(customers.email) = LOWER(auth.jwt() ->> 'email'::text)
  )
);
