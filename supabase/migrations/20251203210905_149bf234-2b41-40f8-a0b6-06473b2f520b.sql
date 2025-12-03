-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Centro techs can view their centro" ON public.centri_assistenza;
DROP POLICY IF EXISTS "Platform admins can manage all centri" ON public.centri_assistenza;
DROP POLICY IF EXISTS "Centro owners can view own record" ON public.centri_assistenza;
DROP POLICY IF EXISTS "Centro owners can update own record" ON public.centri_assistenza;
DROP POLICY IF EXISTS "Anyone can insert centro registration" ON public.centri_assistenza;
DROP POLICY IF EXISTS "Approved centri visible to corners" ON public.centri_assistenza;

-- Recreate simplified policies without recursion

-- Platform admins can do everything (using security definer function)
CREATE POLICY "Platform admins full access centri"
ON public.centri_assistenza
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Centro owners can view their own record
CREATE POLICY "Centro owners view own"
ON public.centri_assistenza
FOR SELECT
USING (owner_user_id = auth.uid());

-- Centro owners can update their own record
CREATE POLICY "Centro owners update own"
ON public.centri_assistenza
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Anyone authenticated can register a centro
CREATE POLICY "Users can register centro"
ON public.centri_assistenza
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

-- Approved centri visible to corners (simple check without subquery)
CREATE POLICY "Approved centri for corners"
ON public.centri_assistenza
FOR SELECT
USING (status = 'approved' AND has_role(auth.uid(), 'corner'));

-- Centro collaborators can view their centro (using direct user_id check)
CREATE POLICY "Collaborators view centro"
ON public.centri_assistenza
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.centro_collaboratori cc
    WHERE cc.centro_id = id 
    AND cc.user_id = auth.uid() 
    AND cc.is_active = true
  )
);