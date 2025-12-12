CREATE OR REPLACE FUNCTION public.charge_commission_on_quote_acceptance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_centro_id UUID;
  v_platform_rate NUMERIC;
  v_corner_rate NUMERIC DEFAULT 0;
  v_gross_margin NUMERIC;
  v_platform_commission NUMERIC;
  v_corner_commission NUMERIC DEFAULT 0;
  v_total_commission NUMERIC;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_warning_threshold NUMERIC;
  v_corner_id UUID;
  v_repair_request RECORD;
  v_direct_to_centro BOOLEAN DEFAULT false;
BEGIN
  -- Only trigger when status changes to 'accepted' and signed_at is set
  IF NEW.status = 'accepted' AND NEW.signed_at IS NOT NULL 
     AND (OLD.status IS NULL OR OLD.status != 'accepted')
     AND NEW.commission_prepaid_at IS NULL THEN
    
    -- Get platform commission rate from settings
    SELECT COALESCE(value, 20) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 20;
    END IF;
    
    -- Calculate gross margin
    v_gross_margin := NEW.total_cost - COALESCE(NEW.parts_cost, 0);
    
    -- Check if this is a Corner-referred repair
    IF NEW.repair_request_id IS NOT NULL THEN
      SELECT corner_id, assigned_provider_id, assigned_provider_type, corner_direct_to_centro
      INTO v_repair_request
      FROM repair_requests 
      WHERE id = NEW.repair_request_id;
      
      v_corner_id := v_repair_request.corner_id;
      v_direct_to_centro := COALESCE(v_repair_request.corner_direct_to_centro, false);
      
      -- Get Centro ID from repair_request
      IF v_repair_request.assigned_provider_type = 'centro' THEN
        v_centro_id := v_repair_request.assigned_provider_id;
      END IF;
      
      -- Get corner commission rate if corner involved
      -- If direct_to_centro, corner gets HALF commission
      IF v_corner_id IS NOT NULL THEN
        SELECT COALESCE(commission_rate, 10) INTO v_corner_rate 
        FROM corners WHERE id = v_corner_id;
        
        IF v_direct_to_centro THEN
          v_corner_rate := v_corner_rate / 2;
        END IF;
        
        v_corner_commission := v_gross_margin * (v_corner_rate / 100);
      END IF;
    ELSE
      -- Direct quote - get Centro from quote creator
      SELECT ca.id INTO v_centro_id
      FROM centri_assistenza ca
      WHERE ca.owner_user_id = NEW.created_by;
    END IF;
    
    -- If no Centro found, skip commission
    IF v_centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate platform commission
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    v_total_commission := v_platform_commission;
    
    -- Get current Centro balance
    SELECT credit_balance, credit_warning_threshold 
    INTO v_current_balance, v_warning_threshold
    FROM centri_assistenza 
    WHERE id = v_centro_id;
    
    v_new_balance := COALESCE(v_current_balance, 0) - v_total_commission;
    
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
      -v_total_commission,
      v_new_balance,
      'Commissione anticipata su preventivo #' || LEFT(NEW.id::text, 8)
    );
    
    -- Create commission_ledger record with prepaid status
    INSERT INTO commission_ledger (
      repair_request_id,
      gross_revenue,
      parts_cost,
      gross_margin,
      platform_commission,
      platform_rate,
      platform_paid,
      platform_paid_at,
      corner_id,
      corner_commission,
      corner_rate,
      centro_id,
      centro_commission,
      centro_rate,
      status
    ) VALUES (
      NEW.repair_request_id,
      NEW.total_cost,
      COALESCE(NEW.parts_cost, 0),
      v_gross_margin,
      v_platform_commission,
      v_platform_rate,
      true,
      now(),
      v_corner_id,
      v_corner_commission,
      CASE WHEN v_corner_id IS NOT NULL THEN v_corner_rate ELSE NULL END,
      v_centro_id,
      v_gross_margin - v_platform_commission - v_corner_commission,
      100 - v_platform_rate - COALESCE(v_corner_rate, 0),
      'prepaid'
    );
    
    -- Mark quote as commission prepaid
    NEW.commission_prepaid_at := now();
    NEW.commission_prepaid_amount := v_total_commission;
  END IF;
  
  RETURN NEW;
END;
$function$;