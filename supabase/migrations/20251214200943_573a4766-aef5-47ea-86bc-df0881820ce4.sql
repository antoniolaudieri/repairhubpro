-- Drop existing problematic policies
DROP POLICY IF EXISTS "Anyone can view active campaign corners" ON public.display_ad_campaign_corners;
DROP POLICY IF EXISTS "Corners can view their campaign assignments" ON public.display_ad_campaign_corners;
DROP POLICY IF EXISTS "Platform admins can manage all campaign corners" ON public.display_ad_campaign_corners;

-- Create security definer function to check if campaign is active
CREATE OR REPLACE FUNCTION public.is_campaign_active(_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM display_ad_campaigns
    WHERE id = _campaign_id AND status = 'active'
  )
$$;

-- Recreate policies using the function
CREATE POLICY "Anyone can view active campaign corners" 
ON public.display_ad_campaign_corners 
FOR SELECT 
USING (is_campaign_active(campaign_id));

CREATE POLICY "Corners can view their campaign assignments" 
ON public.display_ad_campaign_corners 
FOR SELECT 
USING (corner_id IN (SELECT id FROM corners WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins can manage all campaign corners" 
ON public.display_ad_campaign_corners 
FOR ALL 
USING (is_platform_admin(auth.uid()));