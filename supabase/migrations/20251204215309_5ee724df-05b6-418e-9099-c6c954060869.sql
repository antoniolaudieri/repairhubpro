-- Allow Centro admins to view corners that have assigned repair requests to their Centro
CREATE POLICY "Centro admins can view corners with assigned requests"
ON public.corners
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT corner_id 
    FROM repair_requests 
    WHERE assigned_provider_type = 'centro' 
    AND assigned_provider_id IN (
      SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
    )
    AND corner_id IS NOT NULL
  )
);

-- Also allow riparatori to view corners that have assigned repair requests to them
CREATE POLICY "Riparatori can view corners with assigned requests"
ON public.corners
FOR SELECT
USING (
  id IN (
    SELECT DISTINCT corner_id 
    FROM repair_requests 
    WHERE assigned_provider_type = 'riparatore' 
    AND assigned_provider_id IN (
      SELECT id FROM riparatori WHERE user_id = auth.uid()
    )
    AND corner_id IS NOT NULL
  )
);