-- Create table for Centro goals (daily, weekly, monthly targets)
CREATE TABLE public.centro_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('loyalty_cards', 'repairs', 'revenue', 'customers')),
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_achieved BOOLEAN NOT NULL DEFAULT false,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centro_id, goal_type, period, period_start)
);

-- Enable RLS
ALTER TABLE public.centro_goals ENABLE ROW LEVEL SECURITY;

-- Centro owners can manage their goals
CREATE POLICY "Centro owners can manage their goals"
ON public.centro_goals
FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
))
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Platform admins can manage all goals
CREATE POLICY "Platform admins can manage all goals"
ON public.centro_goals
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create trigger to update updated_at
CREATE TRIGGER update_centro_goals_updated_at
BEFORE UPDATE ON public.centro_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();