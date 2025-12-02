-- Allow customers to view orders related to their repairs
CREATE POLICY "Customers can view own repair orders" 
ON public.orders 
FOR SELECT 
USING (
  repair_id IN (
    SELECT r.id
    FROM repairs r
    JOIN devices d ON r.device_id = d.id
    JOIN customers c ON d.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email'::text)
  )
);