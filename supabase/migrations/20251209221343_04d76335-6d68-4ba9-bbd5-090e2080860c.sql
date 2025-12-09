-- Update the function to read platform commission rate dynamically from platform_settings
CREATE OR REPLACE FUNCTION public.calculate_used_device_sale_margins()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sale_price NUMERIC;
  v_platform_rate NUMERIC;
  v_owner_payout NUMERIC DEFAULT 0;
  v_centro_gross NUMERIC;
  v_platform_commission NUMERIC;
  v_centro_net NUMERIC;
BEGIN
  -- Only trigger when status changes to 'sold'
  IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
    v_sale_price := NEW.price;
    
    -- Get platform commission rate dynamically from platform_settings
    SELECT COALESCE(value, 20) INTO v_platform_rate
    FROM platform_settings 
    WHERE key = 'platform_commission_rate';
    
    IF v_platform_rate IS NULL THEN
      v_platform_rate := 20;
    END IF;
    
    -- Calculate based on sale_type
    IF NEW.sale_type = 'conto_vendita' THEN
      -- Consignment: split with customer
      v_owner_payout := v_sale_price * (NEW.owner_split_percentage / 100);
      v_centro_gross := v_sale_price * (NEW.centro_split_percentage / 100);
    ELSE
      -- Alienato or Acquistato: 100% to Centro
      v_owner_payout := 0;
      v_centro_gross := v_sale_price;
    END IF;
    
    -- Platform takes commission from Centro's portion
    v_platform_commission := v_centro_gross * (v_platform_rate / 100);
    v_centro_net := v_centro_gross - v_platform_commission;
    
    -- Update the record with calculated values
    NEW.owner_payout := v_owner_payout;
    NEW.centro_gross_margin := v_centro_gross;
    NEW.sale_platform_commission := v_platform_commission;
    NEW.centro_net_margin := v_centro_net;
    NEW.sold_at := now();
  END IF;
  
  RETURN NEW;
END;
$function$;