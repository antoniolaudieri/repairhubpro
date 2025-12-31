-- Add device_location field to repairs table
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_location TEXT DEFAULT 'in_lab';
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN public.repairs.device_location IS 'Location of the device: in_lab or with_customer';
COMMENT ON COLUMN public.repairs.customer_notified_at IS 'When customer was notified that parts arrived (for device with customer flow)';