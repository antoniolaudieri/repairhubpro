
-- Drop the old check constraint if exists
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new check constraint with all roles
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
CHECK (role IN ('admin', 'technician', 'customer', 'corner', 'riparatore', 'centro_admin', 'centro_tech', 'platform_admin'));
