-- Add UPDATE policy for Centro to mark corner commissions as paid
CREATE POLICY "Centri can update corner_paid on their commissions"
ON public.commission_ledger
FOR UPDATE
USING (
  centro_id IN (
    SELECT id FROM centri_assistenza 
    WHERE owner_user_id = auth.uid()
  )
)
WITH CHECK (
  centro_id IN (
    SELECT id FROM centri_assistenza 
    WHERE owner_user_id = auth.uid()
  )
);