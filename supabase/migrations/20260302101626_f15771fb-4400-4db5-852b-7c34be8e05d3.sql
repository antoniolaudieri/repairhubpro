-- Allow centro admins to insert and read campaigns
CREATE POLICY "Centro admins can insert campaigns"
ON public.ricondizionati_campaigns
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Centro admins can read campaigns"
ON public.ricondizionati_campaigns
FOR SELECT
TO authenticated
USING (true);

-- Allow centro admins to insert and read recipients for their centro
CREATE POLICY "Centro admins can insert recipients"
ON public.ricondizionati_campaign_recipients
FOR INSERT
TO authenticated
WITH CHECK (
  centro_id IS NOT NULL AND 
  centro_id = public.get_user_centro_id(auth.uid())
);

CREATE POLICY "Centro admins can read their recipients"
ON public.ricondizionati_campaign_recipients
FOR SELECT
TO authenticated
USING (
  centro_id = public.get_user_centro_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);