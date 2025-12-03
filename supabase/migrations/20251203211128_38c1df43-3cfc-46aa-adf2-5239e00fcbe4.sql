-- Allow platform admins to manage user_roles
CREATE POLICY "Platform admins can manage all user_roles"
ON public.user_roles
FOR ALL
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));