-- 1. Drop and recreate the trigger function to mark platform_paid = true after deduction
CREATE OR REPLACE FUNCTION public.deduct_commission_from_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entity_type TEXT;
  v_entity_id UUID;
  v_current_balance NUMERIC;
  v_commission_amount NUMERIC;
  v_new_balance NUMERIC;
  v_warning_threshold NUMERIC;
BEGIN
  -- Determine entity type and ID
  IF NEW.centro_id IS NOT NULL THEN
    v_entity_type := 'centro';
    v_entity_id := NEW.centro_id;
    v_commission_amount := NEW.platform_commission;
    
    -- Get current balance
    SELECT credit_balance, credit_warning_threshold INTO v_current_balance, v_warning_threshold
    FROM public.centri_assistenza WHERE id = v_entity_id;
    
    v_new_balance := COALESCE(v_current_balance, 0) - v_commission_amount;
    
    -- Update balance and payment status
    UPDATE public.centri_assistenza 
    SET credit_balance = v_new_balance,
        last_credit_update = now(),
        payment_status = CASE 
          WHEN v_new_balance <= 0 THEN 'suspended'
          WHEN v_new_balance < COALESCE(v_warning_threshold, 50) THEN 'warning'
          ELSE 'good_standing'
        END
    WHERE id = v_entity_id;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (entity_type, entity_id, transaction_type, amount, balance_after, description, commission_id)
    VALUES (v_entity_type, v_entity_id, 'commission_debit', -v_commission_amount, v_new_balance, 'Commissione piattaforma 20%', NEW.id);
    
    -- Mark commission as paid immediately since we just deducted it
    UPDATE public.commission_ledger 
    SET platform_paid = true, platform_paid_at = now()
    WHERE id = NEW.id;
    
  ELSIF NEW.corner_id IS NOT NULL AND NEW.corner_commission > 0 THEN
    -- For corners, they receive commission, not pay it - no deduction needed
    NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Reconciliation script: Process all existing unpaid commissions
DO $$
DECLARE
  r RECORD;
  v_new_balance NUMERIC;
  v_warning_threshold NUMERIC;
BEGIN
  -- Process all unpaid centro commissions
  FOR r IN 
    SELECT cl.id, cl.centro_id, cl.platform_commission, ca.credit_balance, ca.credit_warning_threshold
    FROM commission_ledger cl
    JOIN centri_assistenza ca ON ca.id = cl.centro_id
    WHERE cl.centro_id IS NOT NULL 
    AND (cl.platform_paid = false OR cl.platform_paid IS NULL)
    AND cl.platform_commission > 0
  LOOP
    -- Calculate new balance
    v_new_balance := COALESCE(r.credit_balance, 0) - r.platform_commission;
    v_warning_threshold := COALESCE(r.credit_warning_threshold, 50);
    
    -- Update Centro balance
    UPDATE centri_assistenza 
    SET credit_balance = v_new_balance,
        last_credit_update = now(),
        payment_status = CASE 
          WHEN v_new_balance <= 0 THEN 'suspended'
          WHEN v_new_balance < v_warning_threshold THEN 'warning'
          ELSE 'good_standing'
        END
    WHERE id = r.centro_id;
    
    -- Record transaction in credit_transactions
    INSERT INTO credit_transactions (entity_type, entity_id, transaction_type, amount, balance_after, description, commission_id)
    VALUES ('centro', r.centro_id, 'commission_debit', -r.platform_commission, v_new_balance, 'Commissione piattaforma 20% (riconciliazione)', r.id);
    
    -- Mark commission as paid
    UPDATE commission_ledger 
    SET platform_paid = true, platform_paid_at = now()
    WHERE id = r.id;
    
    RAISE NOTICE 'Processed commission % for centro %, amount: %, new balance: %', r.id, r.centro_id, r.platform_commission, v_new_balance;
  END LOOP;
END;
$$;