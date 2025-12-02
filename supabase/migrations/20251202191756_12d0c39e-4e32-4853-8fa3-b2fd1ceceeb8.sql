-- Add diagnostic fee column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN diagnostic_fee numeric DEFAULT 15.00;

-- Add column to track if diagnostic fee was paid
ALTER TABLE public.repairs 
ADD COLUMN diagnostic_fee_paid boolean DEFAULT false;