-- Add DELETE policy for Centro to delete their appointments
CREATE POLICY "Centro can delete their appointments"
ON public.appointments
FOR DELETE
USING (
  centro_id IN (
    SELECT id FROM public.centri_assistenza
    WHERE owner_user_id = auth.uid()
  )
);

-- Also add DELETE policy for Corners to delete their appointments
CREATE POLICY "Corners can delete their appointments"
ON public.appointments
FOR DELETE
USING (
  corner_id IN (
    SELECT id FROM public.corners
    WHERE user_id = auth.uid()
  )
);