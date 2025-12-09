-- Update function to not require Authorization header since function will be public
CREATE OR REPLACE FUNCTION public.notify_device_interest_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Make HTTP POST to edge function using pg_net (no auth needed - function is public)
    PERFORM net.http_post(
      url := 'https://mivvpthovnkynigfwmjm.supabase.co/functions/v1/notify-device-interest',
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
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;