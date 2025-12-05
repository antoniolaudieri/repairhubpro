-- Allow Corners to update their own repair_requests (to update status after quote signature)
CREATE POLICY "Corners can update their repair_requests" 
ON public.repair_requests 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'corner'::text) 
  AND corner_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'corner'::text) 
  AND corner_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  )
);