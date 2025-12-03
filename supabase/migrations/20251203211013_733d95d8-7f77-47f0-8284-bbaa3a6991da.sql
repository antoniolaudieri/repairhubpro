-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Collaborators view centro" ON public.centri_assistenza;

-- Create a security definer function to check collaborator status without recursion
CREATE OR REPLACE FUNCTION public.is_centro_collaborator(_user_id uuid, _centro_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.centro_collaboratori
    WHERE centro_id = _centro_id
      AND user_id = _user_id
      AND is_active = true
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Collaborators view centro"
ON public.centri_assistenza
FOR SELECT
USING (is_centro_collaborator(auth.uid(), id));