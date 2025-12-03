-- Add RLS policies for centro_admin to manage customers
CREATE POLICY "Centro admins can read customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update customers"
ON public.customers
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage devices
CREATE POLICY "Centro admins can read devices"
ON public.devices
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert devices"
ON public.devices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update devices"
ON public.devices
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage repairs
CREATE POLICY "Centro admins can read repairs"
ON public.repairs
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert repairs"
ON public.repairs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update repairs"
ON public.repairs
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage spare_parts
CREATE POLICY "Centro admins can read all spare_parts"
ON public.spare_parts
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert spare_parts"
ON public.spare_parts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update spare_parts"
ON public.spare_parts
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage repair_parts
CREATE POLICY "Centro admins can read repair_parts"
ON public.repair_parts
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert repair_parts"
ON public.repair_parts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete repair_parts"
ON public.repair_parts
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage orders
CREATE POLICY "Centro admins can read orders"
ON public.orders
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update orders"
ON public.orders
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage order_items
CREATE POLICY "Centro admins can read order_items"
ON public.order_items
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert order_items"
ON public.order_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete order_items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage labor_prices
CREATE POLICY "Centro admins can read labor_prices"
ON public.labor_prices
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert labor_prices"
ON public.labor_prices
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update labor_prices"
ON public.labor_prices
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete labor_prices"
ON public.labor_prices
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage additional_services
CREATE POLICY "Centro admins can read additional_services"
ON public.additional_services
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert additional_services"
ON public.additional_services
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update additional_services"
ON public.additional_services
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete additional_services"
ON public.additional_services
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));

-- Add RLS policies for centro_admin to manage repair_guides
CREATE POLICY "Centro admins can read repair_guides"
ON public.repair_guides
FOR SELECT
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can insert repair_guides"
ON public.repair_guides
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can update repair_guides"
ON public.repair_guides
FOR UPDATE
USING (has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Centro admins can delete repair_guides"
ON public.repair_guides
FOR DELETE
USING (has_role(auth.uid(), 'centro_admin'));