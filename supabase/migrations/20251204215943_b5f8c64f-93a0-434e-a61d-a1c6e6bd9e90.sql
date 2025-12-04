-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Centro admins can view corners with assigned requests" ON public.corners;
DROP POLICY IF EXISTS "Riparatori can view corners with assigned requests" ON public.corners;

-- Create simpler policies using direct auth checks instead of subqueries on repair_requests
-- Centro admins can view all approved corners (they might need to see them for partnerships)
CREATE POLICY "Centro admins can view approved corners"
ON public.corners
FOR SELECT
USING (
  status = 'approved' AND has_role(auth.uid(), 'centro_admin'::text)
);

-- Riparatori can view approved corners
CREATE POLICY "Riparatori can view approved corners"
ON public.corners
FOR SELECT
USING (
  status = 'approved' AND has_role(auth.uid(), 'riparatore'::text)
);