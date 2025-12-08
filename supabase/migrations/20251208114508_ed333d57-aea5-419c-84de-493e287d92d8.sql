-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_charge_commission_on_intake ON repairs;

-- Create BEFORE trigger function (updates NEW and Centro balance, but NOT commission_ledger)
CREATE OR REPLACE FUNCTION public.charge_commission_on_intake_signature()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_centro_id UUID;
  v_platform_rate NUMERIC;
  v_estimated_cost NUMERIC;
  v_parts_cost NUMERIC DEFAULT 0;
  v_gross_margin NUMERIC;
  v_platform_commission NUMERIC;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_warning_threshold NUMERIC;
BEGIN
  -- Trigger on INSERT with signature present, or UPDATE when signature is newly added
  IF NEW.intake_signature IS NOT NULL 
     AND NEW.commission_prepaid_at IS NULL 
     AND (TG_OP = 'INSERT' OR OLD.intake_signature IS NULL OR OLD.intake_signature = '') THEN
    
    -- Get Centro ID from device -> customer -> centro_id
    SELECT c.centro_id INTO v_centro_id
    FROM devices d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = NEW.device_id;
    
    -- If no Centro (not a Centro repair), skip
    IF v_centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get platform commission rate from settings (dynamic!)
    SELECT COALESCE(value, 10) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 10;
    END IF;
    
    -- Use estimated_cost for initial calculation
    v_estimated_cost := COALESCE(NEW.estimated_cost, 0);
    
    -- If no estimated cost, skip (nothing to charge)
    IF v_estimated_cost <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Calculate gross margin (parts_cost is 0 on INSERT as repair_parts don't exist yet)
    v_gross_margin := v_estimated_cost;
    
    -- Calculate platform commission with dynamic rate
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    
    -- Get current Centro balance
    SELECT credit_balance, credit_warning_threshold 
    INTO v_current_balance, v_warning_threshold
    FROM centri_assistenza 
    WHERE id = v_centro_id;
    
    v_new_balance := COALESCE(v_current_balance, 0) - v_platform_commission;
    
    -- Update Centro balance
    UPDATE centri_assistenza 
    SET credit_balance = v_new_balance,
        last_credit_update = now(),
        payment_status = CASE 
          WHEN v_new_balance <= 0 THEN 'suspended'
          WHEN v_new_balance < COALESCE(v_warning_threshold, 50) THEN 'warning'
          ELSE 'good_standing'
        END
    WHERE id = v_centro_id;
    
    -- Record credit transaction
    INSERT INTO credit_transactions (
      entity_type, 
      entity_id, 
      transaction_type, 
      amount, 
      balance_after, 
      description
    ) VALUES (
      'centro',
      v_centro_id,
      'commission_prepaid',
      -v_platform_commission,
      v_new_balance,
      'Commissione anticipata ' || v_platform_rate || '% su ritiro #' || LEFT(NEW.id::text, 8)
    );
    
    -- Mark repair as commission prepaid (this modifies NEW, which is why we need BEFORE trigger)
    NEW.commission_prepaid_at := now();
    NEW.commission_prepaid_amount := v_platform_commission;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create AFTER trigger function (inserts commission_ledger after repair exists)
CREATE OR REPLACE FUNCTION public.create_commission_ledger_on_intake()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_centro_id UUID;
  v_platform_rate NUMERIC;
  v_estimated_cost NUMERIC;
  v_gross_margin NUMERIC;
  v_platform_commission NUMERIC;
BEGIN
  -- Only proceed if commission was just prepaid in this operation
  IF NEW.commission_prepaid_at IS NOT NULL 
     AND (TG_OP = 'INSERT' OR OLD.commission_prepaid_at IS NULL) THEN
    
    -- Get Centro ID from device -> customer -> centro_id
    SELECT c.centro_id INTO v_centro_id
    FROM devices d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = NEW.device_id;
    
    -- If no Centro, skip
    IF v_centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if commission_ledger already exists for this repair
    IF EXISTS (SELECT 1 FROM commission_ledger WHERE repair_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Get platform commission rate from settings
    SELECT COALESCE(value, 10) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 10;
    END IF;
    
    v_estimated_cost := COALESCE(NEW.estimated_cost, 0);
    v_gross_margin := v_estimated_cost;
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    
    -- Create commission_ledger record (now repair exists!)
    INSERT INTO commission_ledger (
      repair_id,
      gross_revenue,
      parts_cost,
      gross_margin,
      platform_commission,
      platform_rate,
      platform_paid,
      platform_paid_at,
      centro_id,
      centro_commission,
      centro_rate,
      status
    ) VALUES (
      NEW.id,
      v_estimated_cost,
      0,
      v_gross_margin,
      v_platform_commission,
      v_platform_rate,
      true,
      now(),
      v_centro_id,
      v_gross_margin - v_platform_commission,
      100 - v_platform_rate,
      'prepaid'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create BEFORE trigger for modifying NEW and updating balances
CREATE TRIGGER trigger_charge_commission_on_intake_before
  BEFORE INSERT OR UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION charge_commission_on_intake_signature();

-- Create AFTER trigger for inserting commission_ledger
CREATE TRIGGER trigger_charge_commission_on_intake_after
  AFTER INSERT OR UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_ledger_on_intake();