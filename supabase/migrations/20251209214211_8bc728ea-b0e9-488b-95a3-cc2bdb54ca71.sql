-- Add sale_type enum for used devices
CREATE TYPE public.used_device_sale_type AS ENUM ('alienato', 'conto_vendita', 'acquistato');

-- Add consignment sale fields to used_devices
ALTER TABLE public.used_devices 
ADD COLUMN sale_type used_device_sale_type NOT NULL DEFAULT 'acquistato',
ADD COLUMN owner_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN owner_split_percentage numeric NOT NULL DEFAULT 60,
ADD COLUMN centro_split_percentage numeric NOT NULL DEFAULT 40,
ADD COLUMN owner_payout numeric DEFAULT 0,
ADD COLUMN centro_gross_margin numeric DEFAULT 0,
ADD COLUMN sale_platform_commission numeric DEFAULT 0,
ADD COLUMN centro_net_margin numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.used_devices.sale_type IS 'alienato=forfeited device (100% Centro), conto_vendita=consignment (split with customer), acquistato=purchased by Centro (100% Centro)';
COMMENT ON COLUMN public.used_devices.owner_split_percentage IS 'Percentage of sale price going to original owner (default 60% for consignment)';
COMMENT ON COLUMN public.used_devices.centro_split_percentage IS 'Percentage of sale price going to Centro (default 40% for consignment)';

-- Create function to calculate sale margins when device is sold
CREATE OR REPLACE FUNCTION public.calculate_used_device_sale_margins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Get platform commission rate
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
$$;

-- Create trigger for sale margin calculation
CREATE TRIGGER trigger_calculate_used_device_sale_margins
BEFORE UPDATE ON public.used_devices
FOR EACH ROW
EXECUTE FUNCTION public.calculate_used_device_sale_margins();

-- Update existing alienated devices from repairs to have correct sale_type
UPDATE public.used_devices 
SET sale_type = 'alienato' 
WHERE source = 'riparazione_alienata';