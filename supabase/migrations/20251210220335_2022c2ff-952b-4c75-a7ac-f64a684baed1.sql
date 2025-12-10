-- Allow platform admins to read all push subscriptions
CREATE POLICY "Platform admins can read all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (is_platform_admin(auth.uid()));