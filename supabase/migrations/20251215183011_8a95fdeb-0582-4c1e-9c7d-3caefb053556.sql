-- Update the commission calculation function to use dynamic direct_to_centro multiplier
CREATE OR REPLACE FUNCTION calculate_commission_on_quote_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_repair_request repair_requests%ROWTYPE;
  v_quote quotes%ROWTYPE;
  v_corner_id uuid;
  v_centro_id uuid;
  v_corner_rate numeric := 10;
  v_platform_rate numeric := 20;
  v_direct_multiplier numeric := 50;
  v_direct_to_centro boolean := false;
  v_gross_revenue numeric;
  v_parts_cost numeric;
  v_gross_margin numeric;
  v_platform_commission numeric;
  v_corner_commission numeric := 0;
  v_centro_commission numeric := 0;
  v_effective_corner_rate numeric;
BEGIN
  -- Only proceed if status changed to awaiting_pickup or quote was accepted
  IF NEW.status NOT IN ('awaiting_pickup', 'quote_accepted') THEN
    RETURN NEW;
  END IF;
  
  -- Get repair request data
  SELECT * INTO v_repair_request FROM repair_requests WHERE id = NEW.id;
  
  -- Get quote data
  SELECT * INTO v_quote FROM quotes WHERE repair_request_id = NEW.id ORDER BY created_at DESC LIMIT 1;
  
  IF v_quote IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get corner and centro IDs
  v_corner_id := v_repair_request.corner_id;
  v_direct_to_centro := COALESCE(v_repair_request.corner_direct_to_centro, false);
  
  IF v_repair_request.assigned_provider_type = 'centro' THEN
    v_centro_id := v_repair_request.assigned_provider_id;
  END IF;
  
  -- Get platform rate
  SELECT value INTO v_platform_rate FROM platform_settings WHERE key = 'platform_commission_rate';
  IF v_platform_rate IS NULL THEN v_platform_rate := 20; END IF;
  
  -- Get direct-to-centro multiplier
  SELECT value INTO v_direct_multiplier FROM platform_settings WHERE key = 'direct_to_centro_commission_multiplier';
  IF v_direct_multiplier IS NULL THEN v_direct_multiplier := 50; END IF;
  
  -- Get corner rate if corner involved
  IF v_corner_id IS NOT NULL THEN
    SELECT COALESCE(commission_rate, 10) INTO v_corner_rate FROM corners WHERE id = v_corner_id;
    
    -- Apply multiplier if direct-to-centro
    IF v_direct_to_centro THEN
      v_effective_corner_rate := v_corner_rate * (v_direct_multiplier / 100);
    ELSE
      v_effective_corner_rate := v_corner_rate;
    END IF;
  END IF;
  
  -- Calculate amounts
  v_gross_revenue := COALESCE(v_quote.total_cost, 0);
  v_parts_cost := COALESCE(v_quote.parts_cost, 0);
  v_gross_margin := v_gross_revenue - v_parts_cost;
  
  -- Calculate commissions
  v_platform_commission := v_gross_margin * (v_platform_rate / 100);
  
  IF v_corner_id IS NOT NULL THEN
    v_corner_commission := v_gross_margin * (v_effective_corner_rate / 100);
  END IF;
  
  -- Centro gets remainder
  v_centro_commission := v_gross_margin - v_platform_commission - v_corner_commission;
  
  -- Check if commission already exists
  IF EXISTS (SELECT 1 FROM commission_ledger WHERE repair_request_id = NEW.id) THEN
    -- Update existing
    UPDATE commission_ledger SET
      gross_revenue = v_gross_revenue,
      parts_cost = v_parts_cost,
      gross_margin = v_gross_margin,
      platform_commission = v_platform_commission,
      platform_rate = v_platform_rate,
      corner_commission = v_corner_commission,
      corner_rate = v_effective_corner_rate,
      centro_commission = v_centro_commission,
      updated_at = now()
    WHERE repair_request_id = NEW.id;
  ELSE
    -- Insert new
    INSERT INTO commission_ledger (
      repair_request_id, corner_id, centro_id,
      gross_revenue, parts_cost, gross_margin,
      platform_commission, platform_rate,
      corner_commission, corner_rate,
      centro_commission, status
    ) VALUES (
      NEW.id, v_corner_id, v_centro_id,
      v_gross_revenue, v_parts_cost, v_gross_margin,
      v_platform_commission, v_platform_rate,
      v_corner_commission, v_effective_corner_rate,
      v_centro_commission, 'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;