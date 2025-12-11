-- Add RLS policies for Centro users to manage customer device interests

-- Centro admins can view interests of their customers
CREATE POLICY "Centro admins can view their customer interests"
ON public.used_device_interests
FOR SELECT
USING (
  has_role(auth.uid(), 'centro_admin'::text) AND 
  customer_id IN (
    SELECT id FROM customers WHERE centro_id = get_user_centro_id(auth.uid())
  )
);

-- Centro admins can insert interests for their customers
CREATE POLICY "Centro admins can insert customer interests"
ON public.used_device_interests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'centro_admin'::text) AND 
  customer_id IN (
    SELECT id FROM customers WHERE centro_id = get_user_centro_id(auth.uid())
  )
);

-- Centro admins can update interests of their customers
CREATE POLICY "Centro admins can update customer interests"
ON public.used_device_interests
FOR UPDATE
USING (
  has_role(auth.uid(), 'centro_admin'::text) AND 
  customer_id IN (
    SELECT id FROM customers WHERE centro_id = get_user_centro_id(auth.uid())
  )
);

-- Centro admins can delete interests of their customers
CREATE POLICY "Centro admins can delete customer interests"
ON public.used_device_interests
FOR DELETE
USING (
  has_role(auth.uid(), 'centro_admin'::text) AND 
  customer_id IN (
    SELECT id FROM customers WHERE centro_id = get_user_centro_id(auth.uid())
  )
);