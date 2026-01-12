
-- Drop the old case-sensitive policy on customers table
DROP POLICY IF EXISTS "Customers can view own record" ON public.customers;

-- Create a new case-insensitive policy
CREATE POLICY "Customers can view own record" 
ON public.customers 
FOR SELECT
TO authenticated
USING (
  LOWER(email) = LOWER(auth.jwt() ->> 'email'::text)
);
