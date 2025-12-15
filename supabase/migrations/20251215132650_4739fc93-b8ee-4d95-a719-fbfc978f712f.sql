-- Fix function search paths
CREATE OR REPLACE FUNCTION generate_loyalty_card_number()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_number := 'LLC-' || 
                  UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4)) || '-' ||
                  UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM loyalty_cards WHERE card_number = new_number) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION set_loyalty_card_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.card_number IS NULL THEN
    NEW.card_number := generate_loyalty_card_number();
    NEW.activated_at := COALESCE(NEW.activated_at, now());
    NEW.expires_at := COALESCE(NEW.expires_at, NEW.activated_at + INTERVAL '1 year');
  END IF;
  RETURN NEW;
END;
$$;