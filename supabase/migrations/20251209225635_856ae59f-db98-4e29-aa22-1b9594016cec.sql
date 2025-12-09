-- Drop and recreate the function with correct pg_net syntax
CREATE OR REPLACE FUNCTION public.notify_device_interest_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Make HTTP POST to edge function using pg_net
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
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdnZwdGhvdm5reW5pZ2Z3bWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5NzYyOSwiZXhwIjoyMDgwMTczNjI5fQ.1VQwIQ8QvN9qWZKl8Y5b_WQqGTJQHG3sLG8mNVbY_uo'
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;