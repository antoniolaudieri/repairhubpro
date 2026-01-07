-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to call the marketing email processor
CREATE OR REPLACE FUNCTION public.trigger_marketing_email_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
  current_hour INTEGER;
  current_day TEXT;
BEGIN
  -- Get current hour and day
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Europe/Rome');
  current_day := LOWER(TO_CHAR(NOW() AT TIME ZONE 'Europe/Rome', 'Day'));
  current_day := TRIM(current_day);
  
  -- Map Italian/English day names
  current_day := CASE current_day
    WHEN 'monday' THEN 'monday'
    WHEN 'tuesday' THEN 'tuesday'
    WHEN 'wednesday' THEN 'wednesday'
    WHEN 'thursday' THEN 'thursday'
    WHEN 'friday' THEN 'friday'
    WHEN 'saturday' THEN 'saturday'
    WHEN 'sunday' THEN 'sunday'
    WHEN 'lunedì' THEN 'monday'
    WHEN 'martedì' THEN 'tuesday'
    WHEN 'mercoledì' THEN 'wednesday'
    WHEN 'giovedì' THEN 'thursday'
    WHEN 'venerdì' THEN 'friday'
    WHEN 'sabato' THEN 'saturday'
    WHEN 'domenica' THEN 'sunday'
    ELSE current_day
  END;

  -- Get settings
  SELECT * INTO settings_record FROM marketing_automation_settings LIMIT 1;
  
  -- Check if automation is enabled
  IF settings_record IS NULL OR NOT settings_record.is_enabled OR NOT settings_record.auto_email_enabled THEN
    RAISE NOTICE 'Marketing automation is disabled';
    RETURN;
  END IF;
  
  -- Check if current hour is within sending hours
  IF current_hour < settings_record.email_send_hours_start OR current_hour >= settings_record.email_send_hours_end THEN
    RAISE NOTICE 'Outside sending hours: % (allowed: %-%))', current_hour, settings_record.email_send_hours_start, settings_record.email_send_hours_end;
    RETURN;
  END IF;
  
  -- Check if current day is in allowed days
  IF NOT (current_day = ANY(settings_record.email_send_days)) THEN
    RAISE NOTICE 'Not a sending day: %', current_day;
    RETURN;
  END IF;

  -- Call the edge function using pg_net
  PERFORM net.http_post(
    url := 'https://mivvpthovnkynigfwmjm.supabase.co/functions/v1/marketing-email-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdnZwdGhvdm5reW5pZ2Z3bWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTc2MjksImV4cCI6MjA4MDE3MzYyOX0.505BrB0P5OfRnMI36jjCvQUPvlRZSU__NQOeAWu20Ls'
    ),
    body := '{"automaticTrigger": true}'::jsonb
  );
  
  RAISE NOTICE 'Marketing email processor triggered at %', NOW();
END;
$$;

-- Schedule the cron job to run every 15 minutes
SELECT cron.schedule(
  'marketing-email-processor',
  '*/15 * * * *',
  $$SELECT public.trigger_marketing_email_processor()$$
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;