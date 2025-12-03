-- Add centro_id to customers table to track ownership
ALTER TABLE public.customers
ADD COLUMN centro_id uuid REFERENCES public.centri_assistenza(id);

-- Create index for better query performance
CREATE INDEX idx_customers_centro_id ON public.customers(centro_id);

-- Drop existing centro_admin policies on customers
DROP POLICY IF EXISTS "Centro admins can read customers" ON public.customers;
DROP POLICY IF EXISTS "Centro admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Centro admins can update customers" ON public.customers;

-- Create helper function to get centro_id for current user
CREATE OR REPLACE FUNCTION public.get_user_centro_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.centri_assistenza
  WHERE owner_user_id = _user_id
  LIMIT 1
$$;

-- Centro admins can only read their own customers OR customers from assigned repair_requests
CREATE POLICY "Centro admins can read own customers"
ON public.customers
FOR SELECT
USING (
  has_role(auth.uid(), 'centro_admin') AND (
    -- Customers created by this centro
    centro_id = get_user_centro_id(auth.uid())
    OR
    -- Customers with repair_requests assigned to this centro
    id IN (
      SELECT customer_id FROM public.repair_requests
      WHERE assigned_provider_type = 'centro'
      AND assigned_provider_id = get_user_centro_id(auth.uid())
    )
  )
);

-- Centro admins can only insert customers for their centro
CREATE POLICY "Centro admins can insert own customers"
ON public.customers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'centro_admin') AND (
    centro_id IS NULL OR centro_id = get_user_centro_id(auth.uid())
  )
);

-- Centro admins can only update their own customers
CREATE POLICY "Centro admins can update own customers"
ON public.customers
FOR UPDATE
USING (
  has_role(auth.uid(), 'centro_admin') AND (
    centro_id = get_user_centro_id(auth.uid())
    OR
    id IN (
      SELECT customer_id FROM public.repair_requests
      WHERE assigned_provider_type = 'centro'
      AND assigned_provider_id = get_user_centro_id(auth.uid())
    )
  )
);