
-- Function to create automatic financial movements from repairs
CREATE OR REPLACE FUNCTION public.sync_repair_to_financial_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centro_id UUID;
  v_final_cost NUMERIC;
  v_parts_cost NUMERIC DEFAULT 0;
  v_labor_cost NUMERIC;
  v_customer_name TEXT;
  v_device_info TEXT;
BEGIN
  -- Only trigger when status changes to 'completed' or 'delivered'
  IF NEW.status IN ('completed', 'delivered') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'delivered')) THEN
    
    -- Get Centro ID from device -> customer -> centro_id
    SELECT c.centro_id, c.name, d.brand || ' ' || d.model
    INTO v_centro_id, v_customer_name, v_device_info
    FROM devices d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = NEW.device_id;
    
    -- If no Centro, skip
    IF v_centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if movement already exists for this repair
    IF EXISTS (SELECT 1 FROM centro_financial_movements WHERE reference_type = 'repair' AND reference_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Get final cost
    v_final_cost := COALESCE(NEW.final_cost, NEW.estimated_cost, 0);
    
    IF v_final_cost <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Calculate parts cost
    SELECT COALESCE(SUM(unit_cost * quantity), 0) INTO v_parts_cost
    FROM repair_parts WHERE repair_id = NEW.id;
    
    -- Calculate labor cost
    v_labor_cost := v_final_cost - v_parts_cost;
    
    -- Insert income movement for repair
    INSERT INTO centro_financial_movements (
      centro_id, type, amount, category, subcategory, description,
      payment_method, movement_date, reference_type, reference_id
    ) VALUES (
      v_centro_id, 'income', v_final_cost, 'Riparazione', v_device_info,
      'Riparazione completata per ' || COALESCE(v_customer_name, 'Cliente') || ' - ' || COALESCE(v_device_info, 'Dispositivo'),
      'cash', CURRENT_DATE, 'repair', NEW.id
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create financial movements from commission ledger
CREATE OR REPLACE FUNCTION public.sync_commission_to_financial_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for Centro commissions when marked as paid
  IF NEW.centro_id IS NOT NULL AND NEW.platform_paid = true AND
     (OLD.platform_paid IS NULL OR OLD.platform_paid = false) THEN
    
    -- Check if expense movement already exists
    IF NOT EXISTS (SELECT 1 FROM centro_financial_movements WHERE reference_type = 'commission' AND reference_id = NEW.id) THEN
      
      -- Insert expense for platform commission
      INSERT INTO centro_financial_movements (
        centro_id, type, amount, category, subcategory, description,
        payment_method, movement_date, reference_type, reference_id
      ) VALUES (
        NEW.centro_id, 'expense', NEW.platform_commission, 'Commissioni', 'Piattaforma',
        'Commissione piattaforma ' || NEW.platform_rate || '% su riparazione',
        'transfer', CURRENT_DATE, 'commission', NEW.id
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create financial movements from used device sales
CREATE OR REPLACE FUNCTION public.sync_used_sale_to_financial_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status changes to 'sold'
  IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
    
    IF NEW.centro_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check if movement already exists
    IF EXISTS (SELECT 1 FROM centro_financial_movements WHERE reference_type = 'used_sale' AND reference_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Insert income for sale
    INSERT INTO centro_financial_movements (
      centro_id, type, amount, category, subcategory, description,
      payment_method, movement_date, reference_type, reference_id
    ) VALUES (
      NEW.centro_id, 'income', NEW.price, 'Vendita Usato', NEW.brand || ' ' || NEW.model,
      'Vendita ' || NEW.device_type || ' ' || NEW.brand || ' ' || NEW.model || ' - Condizione: ' || NEW.condition,
      'cash', CURRENT_DATE, 'used_sale', NEW.id
    );
    
    -- If conto_vendita, register payout to owner as expense
    IF NEW.sale_type = 'conto_vendita' AND NEW.owner_payout > 0 THEN
      INSERT INTO centro_financial_movements (
        centro_id, type, amount, category, subcategory, description,
        payment_method, movement_date, reference_type, reference_id
      ) VALUES (
        NEW.centro_id, 'expense', NEW.owner_payout, 'Pagamenti', 'Conto Vendita',
        'Quota proprietario per vendita ' || NEW.brand || ' ' || NEW.model,
        'cash', CURRENT_DATE, 'used_payout', NEW.id
      );
    END IF;
    
    -- Register platform commission as expense
    IF NEW.sale_platform_commission > 0 THEN
      INSERT INTO centro_financial_movements (
        centro_id, type, amount, category, subcategory, description,
        payment_method, movement_date, reference_type, reference_id
      ) VALUES (
        NEW.centro_id, 'expense', NEW.sale_platform_commission, 'Commissioni', 'Piattaforma Usato',
        'Commissione piattaforma su vendita usato',
        'transfer', CURRENT_DATE, 'used_commission', NEW.id
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create financial movements from loyalty card activations
CREATE OR REPLACE FUNCTION public.sync_loyalty_to_financial_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- Check if movement already exists
    IF EXISTS (SELECT 1 FROM centro_financial_movements WHERE reference_type = 'loyalty_card' AND reference_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Get program settings for price
    SELECT annual_price INTO v_settings
    FROM loyalty_program_settings
    WHERE centro_id = NEW.centro_id AND is_active = true
    LIMIT 1;
    
    IF v_settings IS NOT NULL AND v_settings.annual_price > 0 THEN
      INSERT INTO centro_financial_movements (
        centro_id, type, amount, category, subcategory, description,
        payment_method, movement_date, reference_type, reference_id
      ) VALUES (
        NEW.centro_id, 'income', v_settings.annual_price, 'Tessera Fedeltà', 'Attivazione',
        'Attivazione tessera fedeltà #' || COALESCE(NEW.card_number, LEFT(NEW.id::text, 8)),
        'cash', CURRENT_DATE, 'loyalty_card', NEW.id
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to create financial movements from repair requests (corner referrals)
CREATE OR REPLACE FUNCTION public.sync_corner_referral_to_financial_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_centro_id UUID;
  v_corner_name TEXT;
BEGIN
  -- Only trigger when repair request is completed
  IF NEW.status IN ('completed', 'delivered', 'repair_completed') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'delivered', 'repair_completed')) AND
     NEW.corner_id IS NOT NULL AND
     NEW.assigned_provider_type = 'centro' AND
     NEW.assigned_provider_id IS NOT NULL THEN
    
    v_centro_id := NEW.assigned_provider_id;
    
    -- Get corner name
    SELECT business_name INTO v_corner_name FROM corners WHERE id = NEW.corner_id;
    
    -- Check if movement already exists
    IF EXISTS (SELECT 1 FROM centro_financial_movements WHERE reference_type = 'corner_referral' AND reference_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Get commission info from commission_ledger
    -- Corner commission is paid by platform, not by centro, so we just note it
    -- Centro earns from the repair itself (tracked separately)
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS sync_repair_financial ON repairs;
CREATE TRIGGER sync_repair_financial
  AFTER UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION sync_repair_to_financial_movement();

DROP TRIGGER IF EXISTS sync_commission_financial ON commission_ledger;
CREATE TRIGGER sync_commission_financial
  AFTER UPDATE ON commission_ledger
  FOR EACH ROW
  EXECUTE FUNCTION sync_commission_to_financial_movement();

DROP TRIGGER IF EXISTS sync_used_sale_financial ON used_devices;
CREATE TRIGGER sync_used_sale_financial
  AFTER UPDATE ON used_devices
  FOR EACH ROW
  EXECUTE FUNCTION sync_used_sale_to_financial_movement();

DROP TRIGGER IF EXISTS sync_loyalty_financial ON loyalty_cards;
CREATE TRIGGER sync_loyalty_financial
  AFTER UPDATE ON loyalty_cards
  FOR EACH ROW
  EXECUTE FUNCTION sync_loyalty_to_financial_movement();
