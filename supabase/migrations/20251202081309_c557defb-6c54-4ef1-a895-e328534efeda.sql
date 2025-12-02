-- Fix orders status check constraint to allow all valid statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('draft', 'pending', 'ordered', 'received'));