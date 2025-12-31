-- Add new fields to quotes table for deposit and device tracking
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS device_location text DEFAULT 'in_lab',
ADD COLUMN IF NOT EXISTS parts_ordered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS parts_arrived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS customer_notified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS linked_order_id uuid REFERENCES public.orders(id);

-- Add quote_id to orders table for linking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_device_location ON public.quotes(device_location) WHERE device_location = 'with_customer';
CREATE INDEX IF NOT EXISTS idx_quotes_status_parts ON public.quotes(status) WHERE status IN ('signed', 'parts_ordered', 'parts_arrived', 'customer_notified', 'device_received');
CREATE INDEX IF NOT EXISTS idx_orders_quote_id ON public.orders(quote_id) WHERE quote_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.quotes.device_location IS 'Location of device: with_customer, in_lab';
COMMENT ON COLUMN public.quotes.deposit_amount IS 'Deposit amount paid by customer';
COMMENT ON COLUMN public.quotes.linked_order_id IS 'Linked spare parts order';