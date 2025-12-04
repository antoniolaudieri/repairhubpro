CREATE OR REPLACE FUNCTION public.calculate_commission_on_direct_repair_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_centro_id UUID;
  v_gross_revenue NUMERIC;
  v_parts_cost NUMERIC DEFAULT 0;
  v_gross_margin NUMERIC;
  v_platform_rate NUMERIC;
  v_centro_rate NUMERIC;
  v_platform_commission NUMERIC;
  v_centro_commission NUMERIC;
BEGIN
  -- Solo quando lo stato cambia a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Recupera centro_id dal cliente del dispositivo
    SELECT c.centro_id INTO v_centro_id
    FROM devices d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = NEW.device_id;
    
    -- Se non c'è centro_id, non fare nulla (non è una riparazione di un Centro)
    IF v_centro_id IS NULL THEN 
      RETURN NEW; 
    END IF;
    
    -- Verifica che non esista già un record commission_ledger per questa riparazione
    IF EXISTS (SELECT 1 FROM commission_ledger WHERE repair_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Leggi la commissione piattaforma da platform_settings
    SELECT COALESCE(value, 20) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    -- Se non trovata, usa il default
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 20;
    END IF;
    
    -- La commissione del Centro è il complemento (100% - platform_rate)
    v_centro_rate := 100 - v_platform_rate;
    
    -- Calcola fatturato (final_cost o estimated_cost)
    v_gross_revenue := COALESCE(NEW.final_cost, NEW.estimated_cost, 0);
    
    -- Calcola costo ricambi
    SELECT COALESCE(SUM(unit_cost * quantity), 0) INTO v_parts_cost
    FROM repair_parts WHERE repair_id = NEW.id;
    
    -- Calcola margine lordo
    v_gross_margin := v_gross_revenue - v_parts_cost;
    
    -- Calcola commissioni con i tassi dinamici
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    v_centro_commission := v_gross_margin * (v_centro_rate / 100);
    
    -- Inserisci record commissione
    INSERT INTO commission_ledger (
      repair_id,
      gross_revenue,
      parts_cost,
      gross_margin,
      platform_commission,
      platform_rate,
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
      v_centro_id,
      v_centro_commission,
      v_centro_rate,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;