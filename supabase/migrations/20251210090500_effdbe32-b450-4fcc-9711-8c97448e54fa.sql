-- Add shipping_cost column to repairs table
ALTER TABLE public.repairs ADD COLUMN shipping_cost NUMERIC(10,2) DEFAULT NULL;