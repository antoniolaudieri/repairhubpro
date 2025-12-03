-- Enable Realtime for job_offers table
ALTER TABLE public.job_offers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_offers;

-- Enable Realtime for repair_requests table
ALTER TABLE public.repair_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_requests;

-- Create function to calculate and insert commission when repair_request is completed
CREATE OR REPLACE FUNCTION public.calculate_commission_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_gross_revenue NUMERIC;
  v_parts_cost NUMERIC DEFAULT 0;
  v_gross_margin NUMERIC;
  v_platform_rate NUMERIC DEFAULT 20;
  v_corner_rate NUMERIC DEFAULT 10;
  v_riparatore_rate NUMERIC DEFAULT 60;
  v_centro_rate NUMERIC;
  v_platform_commission NUMERIC;
  v_corner_commission NUMERIC DEFAULT 0;
  v_riparatore_commission NUMERIC DEFAULT 0;
  v_centro_commission NUMERIC DEFAULT 0;
  v_corner_id UUID;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get estimated cost as gross revenue
    v_gross_revenue := COALESCE(NEW.estimated_cost, 0);
    
    -- Calculate gross margin (revenue - parts cost)
    v_gross_margin := v_gross_revenue - v_parts_cost;
    
    -- Get corner_id from repair_request
    v_corner_id := NEW.corner_id;
    
    -- Calculate platform commission (20% of gross margin)
    v_platform_commission := v_gross_margin * (v_platform_rate / 100);
    
    -- Calculate corner commission if exists (10% of gross margin)
    IF v_corner_id IS NOT NULL THEN
      v_corner_commission := v_gross_margin * (v_corner_rate / 100);
    END IF;
    
    -- Calculate provider commission based on type
    IF NEW.assigned_provider_type = 'riparatore' THEN
      -- Get riparatore's commission rate
      SELECT commission_rate INTO v_riparatore_rate 
      FROM public.riparatori 
      WHERE id = NEW.assigned_provider_id;
      
      v_riparatore_rate := COALESCE(v_riparatore_rate, 60);
      v_riparatore_commission := v_gross_margin * (v_riparatore_rate / 100);
      
    ELSIF NEW.assigned_provider_type = 'centro' THEN
      -- Get centro's commission rate
      SELECT commission_rate INTO v_centro_rate 
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
      riparatore_id,
      riparatore_commission,
      riparatore_rate,
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
      CASE WHEN NEW.assigned_provider_type = 'riparatore' THEN NEW.assigned_provider_id ELSE NULL END,
      v_riparatore_commission,
      CASE WHEN NEW.assigned_provider_type = 'riparatore' THEN v_riparatore_rate ELSE NULL END,
      CASE WHEN NEW.assigned_provider_type = 'centro' THEN NEW.assigned_provider_id ELSE NULL END,
      v_centro_commission,
      CASE WHEN NEW.assigned_provider_type = 'centro' THEN v_centro_rate ELSE NULL END,
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS trigger_calculate_commission ON public.repair_requests;
CREATE TRIGGER trigger_calculate_commission
  AFTER UPDATE ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_commission_on_completion();