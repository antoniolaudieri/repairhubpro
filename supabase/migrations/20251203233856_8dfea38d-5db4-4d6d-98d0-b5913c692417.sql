
-- Add credit fields to centri_assistenza
ALTER TABLE public.centri_assistenza
ADD COLUMN IF NOT EXISTS credit_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_warning_threshold NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'good_standing',
ADD COLUMN IF NOT EXISTS last_credit_update TIMESTAMPTZ;

-- Add credit fields to corners
ALTER TABLE public.corners
ADD COLUMN IF NOT EXISTS credit_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_warning_threshold NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'good_standing',
ADD COLUMN IF NOT EXISTS last_credit_update TIMESTAMPTZ;

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('centro', 'corner')),
  entity_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'commission_debit', 'refund', 'adjustment')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  commission_id UUID REFERENCES public.commission_ledger(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create topup_requests table
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('centro', 'corner')),
  entity_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
CREATE POLICY "Platform admins can manage all credit_transactions"
ON public.credit_transactions FOR ALL
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Centri can view their credit_transactions"
ON public.credit_transactions FOR SELECT
USING (entity_type = 'centro' AND entity_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Corners can view their credit_transactions"
ON public.credit_transactions FOR SELECT
USING (entity_type = 'corner' AND entity_id IN (
  SELECT id FROM public.corners WHERE user_id = auth.uid()
));

-- RLS policies for topup_requests
CREATE POLICY "Platform admins can manage all topup_requests"
ON public.topup_requests FOR ALL
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Centri can manage their topup_requests"
ON public.topup_requests FOR ALL
USING (entity_type = 'centro' AND entity_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Corners can manage their topup_requests"
ON public.topup_requests FOR ALL
USING (entity_type = 'corner' AND entity_id IN (
  SELECT id FROM public.corners WHERE user_id = auth.uid()
));

-- Function to deduct commission from credit
CREATE OR REPLACE FUNCTION public.deduct_commission_from_credit()
RETURNS TRIGGER AS $$
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
    
    -- Update balance
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
    
  ELSIF NEW.corner_id IS NOT NULL AND NEW.corner_commission > 0 THEN
    -- For corners, we don't deduct - they receive commission
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for commission deduction
DROP TRIGGER IF EXISTS trigger_deduct_commission ON public.commission_ledger;
CREATE TRIGGER trigger_deduct_commission
AFTER INSERT ON public.commission_ledger
FOR EACH ROW
EXECUTE FUNCTION public.deduct_commission_from_credit();

-- Function to process topup confirmation
CREATE OR REPLACE FUNCTION public.confirm_topup(
  p_topup_id UUID,
  p_confirmed_by UUID
) RETURNS VOID AS $$
DECLARE
  v_topup RECORD;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_warning_threshold NUMERIC;
BEGIN
  -- Get topup request
  SELECT * INTO v_topup FROM public.topup_requests WHERE id = p_topup_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topup request not found or already processed';
  END IF;
  
  IF v_topup.entity_type = 'centro' THEN
    SELECT credit_balance, credit_warning_threshold INTO v_current_balance, v_warning_threshold
    FROM public.centri_assistenza WHERE id = v_topup.entity_id;
    
    v_new_balance := COALESCE(v_current_balance, 0) + v_topup.amount;
    
    UPDATE public.centri_assistenza
    SET credit_balance = v_new_balance,
        last_credit_update = now(),
        payment_status = CASE 
          WHEN v_new_balance <= 0 THEN 'suspended'
          WHEN v_new_balance < COALESCE(v_warning_threshold, 50) THEN 'warning'
          ELSE 'good_standing'
        END
    WHERE id = v_topup.entity_id;
    
  ELSIF v_topup.entity_type = 'corner' THEN
    SELECT credit_balance, credit_warning_threshold INTO v_current_balance, v_warning_threshold
    FROM public.corners WHERE id = v_topup.entity_id;
    
    v_new_balance := COALESCE(v_current_balance, 0) + v_topup.amount;
    
    UPDATE public.corners
    SET credit_balance = v_new_balance,
        last_credit_update = now(),
        payment_status = CASE 
          WHEN v_new_balance <= 0 THEN 'suspended'
          WHEN v_new_balance < COALESCE(v_warning_threshold, 50) THEN 'warning'
          ELSE 'good_standing'
        END
    WHERE id = v_topup.entity_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (entity_type, entity_id, transaction_type, amount, balance_after, description, created_by)
  VALUES (v_topup.entity_type, v_topup.entity_id, 'topup', v_topup.amount, v_new_balance, 'Ricarica credito', p_confirmed_by);
  
  -- Update topup request
  UPDATE public.topup_requests
  SET status = 'confirmed', confirmed_by = p_confirmed_by, confirmed_at = now()
  WHERE id = p_topup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
