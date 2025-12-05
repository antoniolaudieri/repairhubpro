-- Drop and recreate the trigger function to read from quotes table
CREATE OR REPLACE FUNCTION public.calculate_commission_on_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gross_revenue NUMERIC;
  v_parts_cost NUMERIC DEFAULT 0;
  v_gross_margin NUMERIC;
  v_platform_rate NUMERIC DEFAULT 20;
  v_corner_rate NUMERIC DEFAULT 10;
  v_centro_rate NUMERIC;
  v_platform_commission NUMERIC;
  v_corner_commission NUMERIC DEFAULT 0;
  v_centro_commission NUMERIC DEFAULT 0;
  v_corner_id UUID;
  v_quote RECORD;
BEGIN
  -- Only trigger when status changes to a completion-like status
  IF NEW.status IN ('repair_completed', 'delivered') AND (OLD.status IS NULL OR OLD.status NOT IN ('repair_completed', 'delivered')) THEN
    
    -- Check if commission already exists for this repair_request
    IF EXISTS (SELECT 1 FROM commission_ledger WHERE repair_request_id = NEW.id) THEN
      -- Update existing record with correct values from quote
      SELECT total_cost, COALESCE(parts_cost, 0) INTO v_gross_revenue, v_parts_cost
      FROM quotes 
      WHERE repair_request_id = NEW.id AND status = 'accepted'
      ORDER BY created_at DESC
      LIMIT 1;
      
      IF v_gross_revenue IS NOT NULL THEN
        v_gross_margin := v_gross_revenue - v_parts_cost;
        v_corner_id := NEW.corner_id;
        
        -- Get corner rate if corner exists
        IF v_corner_id IS NOT NULL THEN
          SELECT COALESCE(commission_rate, 10) INTO v_corner_rate FROM corners WHERE id = v_corner_id;
        END IF;
        
        -- Get centro rate
        IF NEW.assigned_provider_type = 'centro' AND NEW.assigned_provider_id IS NOT NULL THEN
          SELECT COALESCE(commission_rate, 70) INTO v_centro_rate FROM centri_assistenza WHERE id = NEW.assigned_provider_id;
        ELSE
          v_centro_rate := 70;
        END IF;
        
        -- Calculate commissions
        v_platform_commission := v_gross_margin * (v_platform_rate / 100);
        IF v_corner_id IS NOT NULL THEN
          v_corner_commission := v_gross_margin * (v_corner_rate / 100);
        END IF;
        v_centro_commission := v_gross_margin * (v_centro_rate / 100);
        
        UPDATE commission_ledger SET
          gross_revenue = v_gross_revenue,
          parts_cost = v_parts_cost,
          gross_margin = v_gross_margin,
          platform_commission = v_platform_commission,
          corner_commission = v_corner_commission,
          centro_commission = v_centro_commission,
          updated_at = now()
        WHERE repair_request_id = NEW.id;
      END IF;
      
      RETURN NEW;
    END IF;
    
    -- Get quote data for this repair_request
    SELECT total_cost, COALESCE(parts_cost, 0) INTO v_gross_revenue, v_parts_cost
    FROM quotes 
    WHERE repair_request_id = NEW.id AND status = 'accepted'
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Fallback to estimated_cost if no quote
    IF v_gross_revenue IS NULL THEN
      v_gross_revenue := COALESCE(NEW.estimated_cost, 0);
    END IF;
    
    -- Calculate gross margin (revenue - parts cost)
    v_gross_margin := v_gross_revenue - v_parts_cost;
    
    -- Get corner_id from repair_request
    v_corner_id := NEW.corner_id;
    
    -- Get corner rate if corner exists
    IF v_corner_id IS NOT NULL THEN
      SELECT COALESCE(commission_rate, 10) INTO v_corner_rate FROM corners WHERE id = v_corner_id;
    END IF;
    
    -- Calculate platform commission (20% of gross margin)
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    
    -- Calculate corner commission if exists
    IF v_corner_id IS NOT NULL THEN
      v_corner_commission := v_gross_margin * (v_corner_rate / 100);
    END IF;
    
    -- Calculate provider commission based on type
    IF NEW.assigned_provider_type = 'centro' THEN
      SELECT COALESCE(commission_rate, 70) INTO v_centro_rate 
      FROM public.centri_assistenza 
      WHERE id = NEW.assigned_provider_id;
      
      v_centro_rate := COALESCE(v_centro_rate, 70);
      v_centro_commission := v_gross_margin * (v_centro_rate / 100);
    END IF;
    
    -- Insert commission record
    INSERT INTO public.commission_ledger (
      repair_request_id,
      gross_revenue,
      parts_cost,
      gross_margin,
      platform_commission,
      platform_rate,
      corner_id,
      corner_commission,
      corner_rate,
      centro_id,
      centro_commission,
      centro_rate,
      status
    ) VALUES (
      NEW.id,
      v_gross_revenue,
      v_parts_cost,
      v_gross_margin,
      v_platform_commission,
      v_platform_rate,
      v_corner_id,
      v_corner_commission,
      CASE WHEN v_corner_id IS NOT NULL THEN v_corner_rate ELSE NULL END,
      CASE WHEN NEW.assigned_provider_type = 'centro' THEN NEW.assigned_provider_id ELSE NULL END,
      v_centro_commission,
      CASE WHEN NEW.assigned_provider_type = 'centro' THEN v_centro_rate ELSE NULL END,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_commission_on_completion ON repair_requests;
CREATE TRIGGER trigger_commission_on_completion
  AFTER UPDATE ON repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commission_on_completion();

-- Fix existing commission records with correct values from quotes
UPDATE commission_ledger cl
SET 
  gross_revenue = q.total_cost,
  parts_cost = COALESCE(q.parts_cost, 0),
  gross_margin = q.total_cost - COALESCE(q.parts_cost, 0),
  platform_commission = (q.total_cost - COALESCE(q.parts_cost, 0)) * 0.20,
  corner_commission = (q.total_cost - COALESCE(q.parts_cost, 0)) * 0.10,
  centro_commission = (q.total_cost - COALESCE(q.parts_cost, 0)) * 0.70,
  updated_at = now()
FROM quotes q
WHERE cl.repair_request_id = q.repair_request_id
  AND q.status = 'accepted'
  AND cl.gross_revenue = 0;