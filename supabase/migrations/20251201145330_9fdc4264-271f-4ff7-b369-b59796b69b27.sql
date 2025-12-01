-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('smartphone', 'tablet', 'pc', 'laptop', 'other')),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  imei TEXT,
  password TEXT,
  reported_issue TEXT NOT NULL,
  initial_condition TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create repairs table
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  diagnosis TEXT,
  repair_notes TEXT,
  ai_suggestions TEXT,
  assigned_to TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create spare_parts table
CREATE TABLE public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  model_compatibility TEXT,
  supplier TEXT DEFAULT 'utopya',
  supplier_code TEXT,
  cost DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create repair_parts junction table
CREATE TABLE public.repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES public.spare_parts(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table for spare parts
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  supplier TEXT NOT NULL DEFAULT 'utopya',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
  total_amount DECIMAL(10, 2),
  notes TEXT,
  ordered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_devices_customer_id ON public.devices(customer_id);
CREATE INDEX idx_repairs_device_id ON public.repairs(device_id);
CREATE INDEX idx_repairs_status ON public.repairs(status);
CREATE INDEX idx_repair_parts_repair_id ON public.repair_parts(repair_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);