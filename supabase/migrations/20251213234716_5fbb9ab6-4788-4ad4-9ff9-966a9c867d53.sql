-- Create a trigger function to automatically assign centro_admin role when a Centro is created
CREATE OR REPLACE FUNCTION public.assign_centro_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the centro_admin role for the owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_user_id, 'centro_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on centri_assistenza table
DROP TRIGGER IF EXISTS trigger_assign_centro_admin_role ON public.centri_assistenza;
CREATE TRIGGER trigger_assign_centro_admin_role
  AFTER INSERT ON public.centri_assistenza
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_centro_admin_role();

-- Create similar trigger for Corners
CREATE OR REPLACE FUNCTION public.assign_corner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'corner')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_corner_role ON public.corners;
CREATE TRIGGER trigger_assign_corner_role
  AFTER INSERT ON public.corners
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_corner_role();

-- Create similar trigger for Riparatori
CREATE OR REPLACE FUNCTION public.assign_riparatore_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'riparatore')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_riparatore_role ON public.riparatori;
CREATE TRIGGER trigger_assign_riparatore_role
  AFTER INSERT ON public.riparatori
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_riparatore_role();

-- Fix the existing user: assign centro_admin role to centroassistenza@a.it
INSERT INTO public.user_roles (user_id, role)
VALUES ('c3401cc3-d7f6-4438-83a8-bffa97be0bde', 'centro_admin')
ON CONFLICT (user_id, role) DO NOTHING;