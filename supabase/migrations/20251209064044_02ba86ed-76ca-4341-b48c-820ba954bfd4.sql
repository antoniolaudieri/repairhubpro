-- Create function to automatically create used_device when repair is forfeited
CREATE OR REPLACE FUNCTION public.create_used_device_on_forfeiture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_customer RECORD;
  v_centro_id UUID;
BEGIN
  -- Only trigger when status changes to 'forfeited'
  IF NEW.status = 'forfeited' AND (OLD.status IS NULL OR OLD.status != 'forfeited') THEN
    
    -- Get device details
    SELECT * INTO v_device FROM devices WHERE id = NEW.device_id;
    
    IF v_device IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get customer to find centro_id
    SELECT * INTO v_customer FROM customers WHERE id = v_device.customer_id;
    
    -- If no centro_id on customer, skip
    IF v_customer.centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_centro_id := v_customer.centro_id;
    
    -- Check if used_device already exists for this repair
    IF EXISTS (SELECT 1 FROM used_devices WHERE repair_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Create used_device entry
    INSERT INTO used_devices (
      centro_id,
      repair_id,
      device_type,
      brand,
      model,
      condition,
      source,
      price,
      description,
      status
    ) VALUES (
      v_centro_id,
      NEW.id,
      v_device.device_type,
      v_device.brand,
      v_device.model,
      'alienato'::device_condition,
      'riparazione_alienata'::device_source,
      0, -- Price to be set by Centro
      'Dispositivo alienato da riparazione #' || LEFT(NEW.id::text, 8) || '. ' || 
        COALESCE('Problema originale: ' || v_device.reported_issue, ''),
      'draft'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on repairs table
DROP TRIGGER IF EXISTS trigger_create_used_device_on_forfeiture ON repairs;
CREATE TRIGGER trigger_create_used_device_on_forfeiture
  AFTER UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION create_used_device_on_forfeiture();