-- Allow Corners to update repair_requests they created (for delivery)
CREATE POLICY "Corners can update their repair_requests for delivery"
ON public.repair_requests
FOR UPDATE
USING (
  corner_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  corner_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  )
);