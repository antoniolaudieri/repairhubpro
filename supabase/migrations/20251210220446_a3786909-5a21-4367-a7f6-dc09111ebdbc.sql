-- Allow platform admins to read all profiles
CREATE POLICY "Platform admins can read all profiles"
ON public.profiles
FOR SELECT
USING (is_platform_admin(auth.uid()));