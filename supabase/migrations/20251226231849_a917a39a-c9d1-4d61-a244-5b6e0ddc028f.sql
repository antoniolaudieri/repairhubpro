-- Add Centro review fields to device_health_alerts table
ALTER TABLE public.device_health_alerts
ADD COLUMN IF NOT EXISTS centro_reviewed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS centro_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS centro_action text CHECK (centro_action IN ('confirm', 'dismiss')),
ADD COLUMN IF NOT EXISTS centro_notes text;

-- Add index for faster filtering of unreviewed alerts
CREATE INDEX IF NOT EXISTS idx_device_health_alerts_pending_review 
ON public.device_health_alerts(centro_id, centro_reviewed, status) 
WHERE centro_reviewed = false AND status IN ('pending', 'sent');

-- Add first_sync_at column to track installation date for grace periods
ALTER TABLE public.device_health_logs
ADD COLUMN IF NOT EXISTS first_sync_at timestamp with time zone;

-- Comment explaining the new workflow
COMMENT ON COLUMN public.device_health_alerts.centro_reviewed IS 'Whether the Centro has reviewed this alert';
COMMENT ON COLUMN public.device_health_alerts.centro_action IS 'Centro action: confirm (notify customer) or dismiss';
COMMENT ON COLUMN public.device_health_alerts.centro_notes IS 'Internal notes from Centro technician about the alert';