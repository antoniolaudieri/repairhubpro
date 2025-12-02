-- Allow customers to view repair parts for their own repairs (without seeing individual prices in UI)
CREATE POLICY "Customers can view own repair parts"
ON public.repair_parts
FOR SELECT
USING (
  repair_id IN (
    SELECT r.id
    FROM repairs r
    JOIN devices d ON r.device_id = d.id
    JOIN customers c ON d.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email')
  )
);