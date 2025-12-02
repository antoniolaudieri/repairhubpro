-- Add repair_id to orders to track orders created from repairs
ALTER TABLE public.orders ADD COLUMN repair_id uuid REFERENCES public.repairs(id) ON DELETE SET NULL;

-- Add index for faster queries
CREATE INDEX idx_orders_repair_id ON public.orders(repair_id);