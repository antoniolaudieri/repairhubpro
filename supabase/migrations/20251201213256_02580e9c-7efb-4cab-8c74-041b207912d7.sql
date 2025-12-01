-- Allow customers to view their own devices
CREATE POLICY "Customers can view own devices"
ON public.devices
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers 
    WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Allow customers to view their own repairs
CREATE POLICY "Customers can view own repairs"
ON public.repairs
FOR SELECT
TO authenticated
USING (
  device_id IN (
    SELECT d.id FROM public.devices d
    JOIN public.customers c ON d.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email'::text)
  )
);

-- Allow customers to view their own customer record
CREATE POLICY "Customers can view own record"
ON public.customers
FOR SELECT
TO authenticated
USING (
  email = (auth.jwt() ->> 'email'::text)
);