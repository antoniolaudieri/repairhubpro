-- Add column to store installed apps data in device health logs
ALTER TABLE public.device_health_logs
ADD COLUMN IF NOT EXISTS installed_apps jsonb DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.device_health_logs.installed_apps IS 'JSON array of installed apps with storage info from Android native app';