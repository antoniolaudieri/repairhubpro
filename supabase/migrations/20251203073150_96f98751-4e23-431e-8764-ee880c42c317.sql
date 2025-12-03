-- Add forfeiture tracking fields to repairs table
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS forfeiture_warning_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS forfeited_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN public.repairs.forfeiture_warning_sent_at IS 'Timestamp when 7-day warning was sent before forfeiture';
COMMENT ON COLUMN public.repairs.forfeited_at IS 'Timestamp when device was automatically forfeited after 30 days';