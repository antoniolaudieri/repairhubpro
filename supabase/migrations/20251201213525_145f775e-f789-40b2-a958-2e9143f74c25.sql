-- Add fields to repairs table for final cost acceptance
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS final_cost_signature TEXT,
ADD COLUMN IF NOT EXISTS final_cost_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.repairs.final_cost_signature IS 'Customer signature data in base64 format for final cost acceptance';
COMMENT ON COLUMN public.repairs.final_cost_accepted_at IS 'Timestamp when customer accepted the final cost';

-- Allow customers to update their own repair signature
CREATE POLICY "Customers can sign final cost"
ON public.repairs
FOR UPDATE
TO authenticated
USING (
  device_id IN (
    SELECT d.id FROM public.devices d
    JOIN public.customers c ON d.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email'::text)
  )
)
WITH CHECK (
  device_id IN (
    SELECT d.id FROM public.devices d
    JOIN public.customers c ON d.customer_id = c.id
    WHERE c.email = (auth.jwt() ->> 'email'::text)
  )
);