-- Allow Corners to update quotes for their repair_requests (to capture customer signature)
CREATE POLICY "Corners can update quotes for their repair_requests" 
ON public.quotes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'corner'::text) 
  AND repair_request_id IN (
    SELECT id FROM repair_requests 
    WHERE corner_id IN (
      SELECT id FROM corners WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'corner'::text) 
  AND repair_request_id IN (
    SELECT id FROM repair_requests 
    WHERE corner_id IN (
      SELECT id FROM corners WHERE user_id = auth.uid()
    )
  )
);