-- Aggiungi campo tracking_number alla tabella orders
ALTER TABLE public.orders 
ADD COLUMN tracking_number TEXT;