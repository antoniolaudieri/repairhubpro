-- Create loyalty_cards table
CREATE TABLE public.loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'bonifico')),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 30,
  platform_commission NUMERIC NOT NULL DEFAULT 1.50,
  centro_revenue NUMERIC NOT NULL DEFAULT 28.50,
  devices_used INTEGER NOT NULL DEFAULT 0,
  max_devices INTEGER NOT NULL DEFAULT 3,
  card_number TEXT UNIQUE,
  bonifico_confirmed_at TIMESTAMPTZ,
  bonifico_confirmed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, centro_id, status)
);

-- Create loyalty_card_usages table
CREATE TABLE public.loyalty_card_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_card_id UUID NOT NULL REFERENCES public.loyalty_cards(id) ON DELETE CASCADE,
  repair_id UUID REFERENCES public.repairs(id),
  repair_request_id UUID REFERENCES public.repair_requests(id),
  device_id UUID REFERENCES public.devices(id),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('diagnostic_fee', 'repair_discount')),
  original_amount NUMERIC NOT NULL,
  discounted_amount NUMERIC NOT NULL,
  savings NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_card_usages ENABLE ROW LEVEL SECURITY;

-- Generate unique card number function
CREATE OR REPLACE FUNCTION generate_loyalty_card_number()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to generate card number on activation
CREATE OR REPLACE FUNCTION set_loyalty_card_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.card_number IS NULL THEN
    NEW.card_number := generate_loyalty_card_number();
    NEW.activated_at := COALESCE(NEW.activated_at, now());
    NEW.expires_at := COALESCE(NEW.expires_at, NEW.activated_at + INTERVAL '1 year');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_loyalty_card_number
BEFORE INSERT OR UPDATE ON public.loyalty_cards
FOR EACH ROW EXECUTE FUNCTION set_loyalty_card_number();

-- Trigger to update updated_at
CREATE TRIGGER update_loyalty_cards_updated_at
BEFORE UPDATE ON public.loyalty_cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for loyalty_cards
CREATE POLICY "customers_view_own_loyalty_cards" ON public.loyalty_cards
FOR SELECT USING (
  customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "centri_manage_own_loyalty_cards" ON public.loyalty_cards
FOR ALL USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
);

CREATE POLICY "platform_admin_manage_all_loyalty_cards" ON public.loyalty_cards
FOR ALL USING (is_platform_admin(auth.uid()));

-- RLS Policies for loyalty_card_usages
CREATE POLICY "customers_view_own_loyalty_usages" ON public.loyalty_card_usages
FOR SELECT USING (
  loyalty_card_id IN (
    SELECT id FROM loyalty_cards WHERE customer_id IN (
      SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
    )
  )
);

CREATE POLICY "centri_manage_own_loyalty_usages" ON public.loyalty_card_usages
FOR ALL USING (
  loyalty_card_id IN (
    SELECT id FROM loyalty_cards WHERE centro_id IN (
      SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "platform_admin_manage_all_loyalty_usages" ON public.loyalty_card_usages
FOR ALL USING (is_platform_admin(auth.uid()));

-- Index for performance
CREATE INDEX idx_loyalty_cards_customer_centro ON public.loyalty_cards(customer_id, centro_id);
CREATE INDEX idx_loyalty_cards_status ON public.loyalty_cards(status);
CREATE INDEX idx_loyalty_card_usages_card ON public.loyalty_card_usages(loyalty_card_id);