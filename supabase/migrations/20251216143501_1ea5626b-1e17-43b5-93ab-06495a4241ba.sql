-- Add technician signature field to forensic_reports table
ALTER TABLE public.forensic_reports 
ADD COLUMN IF NOT EXISTS technician_signature TEXT;