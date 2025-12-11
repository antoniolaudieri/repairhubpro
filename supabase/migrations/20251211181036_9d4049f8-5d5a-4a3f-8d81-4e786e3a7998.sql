-- Allow platform admins to read all user_roles
CREATE POLICY "Platform admins can read all user_roles"
ON public.user_roles
FOR SELECT
USING (is_platform_admin(auth.uid()));