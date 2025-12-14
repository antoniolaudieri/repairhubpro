-- Create maintenance_predictions table for predictive maintenance AI
CREATE TABLE public.maintenance_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'battery', 'screen', 'charging_port', 'storage', 'general_checkup', 'software', 'speaker', 'camera'
  urgency TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high'
  predicted_issue TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 70,
  reasoning TEXT,
  recommended_action TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'notified', 'scheduled', 'completed', 'dismissed'
  notified_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismiss_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_predictions ENABLE ROW LEVEL SECURITY;

-- RLS: Centri can view their own predictions
CREATE POLICY "Centri can view their maintenance predictions"
ON public.maintenance_predictions
FOR SELECT
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

-- RLS: Centri can insert predictions for their customers
CREATE POLICY "Centri can insert maintenance predictions"
ON public.maintenance_predictions
FOR INSERT
WITH CHECK (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

-- RLS: Centri can update their predictions
CREATE POLICY "Centri can update their maintenance predictions"
ON public.maintenance_predictions
FOR UPDATE
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

-- RLS: Centri can delete their predictions
CREATE POLICY "Centri can delete their maintenance predictions"
ON public.maintenance_predictions
FOR DELETE
USING (centro_id IN (
  SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
));

-- RLS: Platform admins can manage all predictions
CREATE POLICY "Platform admins can manage all maintenance predictions"
ON public.maintenance_predictions
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_maintenance_predictions_updated_at
BEFORE UPDATE ON public.maintenance_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_maintenance_predictions_centro_id ON public.maintenance_predictions(centro_id);
CREATE INDEX idx_maintenance_predictions_customer_id ON public.maintenance_predictions(customer_id);
CREATE INDEX idx_maintenance_predictions_device_id ON public.maintenance_predictions(device_id);
CREATE INDEX idx_maintenance_predictions_status ON public.maintenance_predictions(status);
CREATE INDEX idx_maintenance_predictions_urgency ON public.maintenance_predictions(urgency);