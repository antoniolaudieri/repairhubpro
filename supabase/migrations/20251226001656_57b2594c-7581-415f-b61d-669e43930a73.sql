-- Create customer_achievements table for gamification
CREATE TABLE public.customer_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER NOT NULL DEFAULT 0,
  target INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, centro_id, achievement_type)
);

-- Create customer_gamification_stats table
CREATE TABLE public.customer_gamification_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_sync_date DATE,
  total_syncs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, centro_id)
);

-- Create smart_reminders table
CREATE TABLE public.smart_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  trigger_data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_achievements
CREATE POLICY "Centro can view their customers achievements" 
ON public.customer_achievements FOR SELECT 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

CREATE POLICY "Centro can manage their customers achievements" 
ON public.customer_achievements FOR ALL 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

-- RLS Policies for customer_gamification_stats
CREATE POLICY "Centro can view their customers stats" 
ON public.customer_gamification_stats FOR SELECT 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

CREATE POLICY "Centro can manage their customers stats" 
ON public.customer_gamification_stats FOR ALL 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

-- RLS Policies for smart_reminders
CREATE POLICY "Centro can view their customers reminders" 
ON public.smart_reminders FOR SELECT 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

CREATE POLICY "Centro can manage their customers reminders" 
ON public.smart_reminders FOR ALL 
USING (
  centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid())
  OR is_centro_collaborator(auth.uid(), centro_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_customer_achievements_updated_at
BEFORE UPDATE ON public.customer_achievements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_gamification_stats_updated_at
BEFORE UPDATE ON public.customer_gamification_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.smart_reminders;