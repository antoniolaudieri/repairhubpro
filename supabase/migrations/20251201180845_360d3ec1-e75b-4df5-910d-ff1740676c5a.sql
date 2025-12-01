-- Create enum for roles if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'customer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for appointments table
CREATE POLICY "Anyone can insert appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Technicians and admins can read appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for feedback table
CREATE POLICY "Anyone can insert feedback"
ON public.feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Technicians and admins can read feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for customers table
CREATE POLICY "Technicians and admins can read customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for devices table
CREATE POLICY "Technicians and admins can read devices"
ON public.devices
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert devices"
ON public.devices
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update devices"
ON public.devices
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for repairs table
CREATE POLICY "Technicians and admins can read repairs"
ON public.repairs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert repairs"
ON public.repairs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update repairs"
ON public.repairs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for spare_parts table
CREATE POLICY "Technicians and admins can read spare_parts"
ON public.spare_parts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert spare_parts"
ON public.spare_parts
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update spare_parts"
ON public.spare_parts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for orders table
CREATE POLICY "Technicians and admins can read orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for order_items table
CREATE POLICY "Technicians and admins can read order_items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert order_items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for repair_parts table
CREATE POLICY "Technicians and admins can read repair_parts"
ON public.repair_parts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can insert repair_parts"
ON public.repair_parts
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for profiles table
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Technicians and admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);