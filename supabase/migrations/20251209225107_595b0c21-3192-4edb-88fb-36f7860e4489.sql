-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to call edge function on device publish
CREATE OR REPLACE FUNCTION public.notify_device_interest_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Only trigger when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get Supabase URL from environment (stored in vault or hardcoded for now)
    supabase_url := 'https://mivvpthovnkynigfwmjm.supabase.co';
    
    -- Make HTTP POST to edge function
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/notify-device-interest',
      body := jsonb_build_object(
        'record', jsonb_build_object(
          'id', NEW.id,
          'device_type', NEW.device_type,
          'brand', NEW.brand,
          'model', NEW.model,
          'price', NEW.price,
          'status', NEW.status,
          'centro_id', NEW.centro_id
        )
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdnZwdGhvdm5reW5pZ2Z3bWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5NzYyOSwiZXhwIjoyMDgwMTczNjI5fQ.1VQwIQ8QvN9qWZKl8Y5b_WQqGTJQHG3sLG8mNVbY_uo'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on used_devices table
DROP TRIGGER IF EXISTS trigger_notify_device_interest ON used_devices;
CREATE TRIGGER trigger_notify_device_interest
  AFTER UPDATE ON used_devices
  FOR EACH ROW
  EXECUTE FUNCTION notify_device_interest_on_publish();