-- Create repair history table to track all changes
CREATE TABLE public.repair_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_history ENABLE ROW LEVEL SECURITY;

-- Create policy for centro users to view repair history
CREATE POLICY "Users can view repair history for their centro repairs"
ON public.repair_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repairs r
    JOIN public.devices d ON r.device_id = d.id
    JOIN public.customers c ON d.customer_id = c.id
    JOIN public.centri_assistenza ca ON c.centro_id = ca.id
    WHERE r.id = repair_history.repair_id
    AND ca.owner_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.centro_collaboratori cc
    JOIN public.repairs r ON repair_history.repair_id = r.id
    JOIN public.devices d ON r.device_id = d.id
    JOIN public.customers c ON d.customer_id = c.id
    WHERE cc.centro_id = c.centro_id
    AND cc.user_id = auth.uid()
    AND cc.is_active = true
  )
);

-- Create index for faster queries
CREATE INDEX idx_repair_history_repair_id ON public.repair_history(repair_id);
CREATE INDEX idx_repair_history_changed_at ON public.repair_history(changed_at DESC);

-- Create function to track repair changes
CREATE OR REPLACE FUNCTION public.track_repair_changes()
RETURNS TRIGGER AS $$
DECLARE
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Track status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;

  -- Track priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'priority', OLD.priority, NEW.priority, auth.uid());
  END IF;

  -- Track estimated_cost changes
  IF OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'estimated_cost', OLD.estimated_cost::TEXT, NEW.estimated_cost::TEXT, auth.uid());
  END IF;

  -- Track final_cost changes
  IF OLD.final_cost IS DISTINCT FROM NEW.final_cost THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'final_cost', OLD.final_cost::TEXT, NEW.final_cost::TEXT, auth.uid());
  END IF;

  -- Track diagnosis changes
  IF OLD.diagnosis IS DISTINCT FROM NEW.diagnosis THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'diagnosis', LEFT(OLD.diagnosis, 500), LEFT(NEW.diagnosis, 500), auth.uid());
  END IF;

  -- Track repair_notes changes
  IF OLD.repair_notes IS DISTINCT FROM NEW.repair_notes THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'repair_notes', LEFT(OLD.repair_notes, 500), LEFT(NEW.repair_notes, 500), auth.uid());
  END IF;

  -- Track assigned_to changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'assigned_to', OLD.assigned_to, NEW.assigned_to, auth.uid());
  END IF;

  -- Track acconto changes
  IF OLD.acconto IS DISTINCT FROM NEW.acconto THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'acconto', OLD.acconto::TEXT, NEW.acconto::TEXT, auth.uid());
  END IF;

  -- Track device_location changes
  IF OLD.device_location IS DISTINCT FROM NEW.device_location THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'device_location', OLD.device_location, NEW.device_location, auth.uid());
  END IF;

  -- Track storage_slot changes
  IF OLD.storage_slot IS DISTINCT FROM NEW.storage_slot THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'storage_slot', OLD.storage_slot::TEXT, NEW.storage_slot::TEXT, auth.uid());
  END IF;

  -- Track shipping_cost changes
  IF OLD.shipping_cost IS DISTINCT FROM NEW.shipping_cost THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'shipping_cost', OLD.shipping_cost::TEXT, NEW.shipping_cost::TEXT, auth.uid());
  END IF;

  -- Track signature events
  IF OLD.intake_signature IS NULL AND NEW.intake_signature IS NOT NULL THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'intake_signature', NULL, 'Firmato', auth.uid());
  END IF;

  IF OLD.final_cost_signature IS NULL AND NEW.final_cost_signature IS NOT NULL THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'final_cost_signature', NULL, 'Firmato', auth.uid());
  END IF;

  -- Track diagnostic_fee_paid changes
  IF OLD.diagnostic_fee_paid IS DISTINCT FROM NEW.diagnostic_fee_paid THEN
    INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'diagnostic_fee_paid', OLD.diagnostic_fee_paid::TEXT, NEW.diagnostic_fee_paid::TEXT, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER repair_changes_trigger
AFTER UPDATE ON public.repairs
FOR EACH ROW
EXECUTE FUNCTION public.track_repair_changes();

-- Also track creation
CREATE OR REPLACE FUNCTION public.track_repair_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.repair_history (repair_id, field_changed, old_value, new_value, changed_by)
  VALUES (NEW.id, 'created', NULL, 'Riparazione creata', auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER repair_creation_trigger
AFTER INSERT ON public.repairs
FOR EACH ROW
EXECUTE FUNCTION public.track_repair_creation();