-- Add repair_request_id to quotes table to link quotes to Corner segnalazioni
ALTER TABLE public.quotes ADD COLUMN repair_request_id uuid REFERENCES public.repair_requests(id);

-- Add RLS policy for Corners to view quotes linked to their repair requests
CREATE POLICY "Corners can view quotes for their repair_requests" 
ON public.quotes 
FOR SELECT 
USING (
  has_role(auth.uid(), 'corner') AND 
  repair_request_id IN (
    SELECT id FROM public.repair_requests 
    WHERE corner_id IN (
      SELECT id FROM public.corners WHERE user_id = auth.uid()
    )
  )
);

-- Add index for performance
CREATE INDEX idx_quotes_repair_request_id ON public.quotes(repair_request_id);