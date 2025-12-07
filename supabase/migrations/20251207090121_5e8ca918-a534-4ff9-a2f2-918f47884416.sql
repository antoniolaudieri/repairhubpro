
-- Add field to track prepaid commission on direct repairs
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS commission_prepaid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS commission_prepaid_amount NUMERIC DEFAULT 0;

-- Create function to charge commission on intake signature for direct repairs
CREATE OR REPLACE FUNCTION public.charge_commission_on_intake_signature()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Only trigger when intake_signature is set and commission not yet prepaid
  IF NEW.intake_signature IS NOT NULL 
     AND (OLD.intake_signature IS NULL OR OLD.intake_signature = '')
     AND NEW.commission_prepaid_at IS NULL THEN
    
    -- Get Centro ID from device -> customer -> centro_id
    SELECT c.centro_id INTO v_centro_id
    FROM devices d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = NEW.device_id;
    
    -- If no Centro (not a Centro repair), skip
    IF v_centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get platform commission rate from settings
    SELECT COALESCE(value, 20) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 20;
    END IF;
    
    -- Use estimated_cost for initial calculation
    v_estimated_cost := COALESCE(NEW.estimated_cost, 0);
    
    -- If no estimated cost, skip (nothing to charge)
    IF v_estimated_cost <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Calculate parts cost from repair_parts if any exist
    SELECT COALESCE(SUM(unit_cost * quantity), 0) INTO v_parts_cost
    FROM repair_parts WHERE repair_id = NEW.id;
    
    -- Calculate gross margin
    v_gross_margin := v_estimated_cost - v_parts_cost;
    
    -- Calculate platform commission
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
      'Commissione anticipata su ritiro #' || LEFT(NEW.id::text, 8)
    );
    
    -- Create commission_ledger record with prepaid status
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
      v_parts_cost,
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
    
    -- Mark repair as commission prepaid
    NEW.commission_prepaid_at := now();
    NEW.commission_prepaid_amount := v_platform_commission;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on repairs table for intake signature
DROP TRIGGER IF EXISTS trigger_charge_commission_on_intake ON repairs;
CREATE TRIGGER trigger_charge_commission_on_intake
  BEFORE UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION charge_commission_on_intake_signature();
