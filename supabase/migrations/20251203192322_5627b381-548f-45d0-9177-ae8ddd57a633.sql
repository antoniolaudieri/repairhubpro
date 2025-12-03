-- Add deposit/advance payment field to repairs table
ALTER TABLE public.repairs 
ADD COLUMN acconto numeric DEFAULT 0;