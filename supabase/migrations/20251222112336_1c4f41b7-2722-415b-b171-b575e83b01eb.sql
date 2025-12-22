-- =====================================================
-- DEVICE HEALTH MONITORING SYSTEM
-- Backend per Android APK + iOS WebApp
-- =====================================================

-- Tabella principale: log salute dispositivi
CREATE TABLE public.device_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE SET NULL,
  
  -- Fonte dati
  source TEXT NOT NULL DEFAULT 'android_native' CHECK (source IN ('android_native', 'ios_webapp', 'manual_quiz')),
  
  -- Metriche Batteria
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  battery_health TEXT CHECK (battery_health IN ('good', 'overheat', 'dead', 'over_voltage', 'unspecified_failure', 'cold', 'unknown')),
  battery_cycles INTEGER,
  battery_temperature NUMERIC,
  is_charging BOOLEAN,
  
  -- Metriche Storage
  storage_total_gb NUMERIC,
  storage_used_gb NUMERIC,
  storage_available_gb NUMERIC,
  storage_percent_used NUMERIC,
  
  -- Metriche Performance/RAM
  ram_total_mb NUMERIC,
  ram_available_mb NUMERIC,
  ram_percent_used NUMERIC,
  
  -- Info Sistema
  os_version TEXT,
  device_manufacturer TEXT,
  device_model_info TEXT,
  app_version TEXT,
  
  -- Calcoli e Analisi
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  anomalies JSONB DEFAULT '[]'::jsonb,
  ai_analysis TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella quiz diagnostici (per iOS WebApp)
CREATE TABLE public.diagnostic_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id) ON DELETE SET NULL,
  
  -- Risposte quiz (struttura flessibile)
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Analisi AI
  ai_analysis TEXT,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Stato
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'analyzed')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Tabella alert automatici
CREATE TABLE public.device_health_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  device_health_log_id UUID REFERENCES public.device_health_logs(id) ON DELETE SET NULL,
  diagnostic_quiz_id UUID REFERENCES public.diagnostic_quizzes(id) ON DELETE SET NULL,
  
  -- Tipo e severità
  alert_type TEXT NOT NULL CHECK (alert_type IN ('battery_critical', 'storage_full', 'performance_low', 'general_warning', 'checkup_reminder')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Contenuto
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recommended_action TEXT,
  
  -- Stato comunicazione
  email_sent_at TIMESTAMP WITH TIME ZONE,
  push_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  customer_viewed_at TIMESTAMP WITH TIME ZONE,
  customer_response TEXT CHECK (customer_response IN ('booked_diagnosis', 'dismissed', 'later')),
  customer_response_at TIMESTAMP WITH TIME ZONE,
  
  -- Offerta associata
  discount_offered NUMERIC DEFAULT 0,
  discount_code TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'responded', 'resolved', 'expired')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Configurazione monitoring per centro
CREATE TABLE public.device_health_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL UNIQUE REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  
  -- Abilitazione
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  android_monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  ios_webapp_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Frequenze
  sync_interval_hours INTEGER NOT NULL DEFAULT 12,
  quiz_reminder_days INTEGER NOT NULL DEFAULT 30,
  
  -- Soglie alert
  battery_critical_threshold INTEGER NOT NULL DEFAULT 20,
  battery_warning_threshold INTEGER NOT NULL DEFAULT 40,
  storage_critical_threshold INTEGER NOT NULL DEFAULT 90,
  storage_warning_threshold INTEGER NOT NULL DEFAULT 80,
  health_score_critical_threshold INTEGER NOT NULL DEFAULT 40,
  health_score_warning_threshold INTEGER NOT NULL DEFAULT 60,
  
  -- Offerte automatiche
  auto_discount_on_critical BOOLEAN NOT NULL DEFAULT true,
  critical_discount_percent NUMERIC NOT NULL DEFAULT 10,
  warning_discount_percent NUMERIC NOT NULL DEFAULT 5,
  
  -- Gamification
  points_per_checkup INTEGER NOT NULL DEFAULT 10,
  badge_after_checkups INTEGER NOT NULL DEFAULT 6,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Badge e achievement clienti
CREATE TABLE public.customer_health_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  
  badge_type TEXT NOT NULL CHECK (badge_type IN ('first_checkup', 'device_guardian', 'health_champion', 'early_detector', 'streak_7', 'streak_30')),
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  badge_icon TEXT,
  
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(customer_id, centro_id, badge_type)
);

-- Indici per performance
CREATE INDEX idx_device_health_logs_customer ON public.device_health_logs(customer_id);
CREATE INDEX idx_device_health_logs_centro ON public.device_health_logs(centro_id);
CREATE INDEX idx_device_health_logs_device ON public.device_health_logs(device_id);
CREATE INDEX idx_device_health_logs_created ON public.device_health_logs(created_at DESC);
CREATE INDEX idx_device_health_logs_score ON public.device_health_logs(health_score);

CREATE INDEX idx_diagnostic_quizzes_customer ON public.diagnostic_quizzes(customer_id);
CREATE INDEX idx_diagnostic_quizzes_centro ON public.diagnostic_quizzes(centro_id);

CREATE INDEX idx_device_health_alerts_customer ON public.device_health_alerts(customer_id);
CREATE INDEX idx_device_health_alerts_centro ON public.device_health_alerts(centro_id);
CREATE INDEX idx_device_health_alerts_status ON public.device_health_alerts(status);

-- Enable RLS
ALTER TABLE public.device_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_health_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies: device_health_logs
CREATE POLICY "Centro owners can manage health logs"
  ON public.device_health_logs FOR ALL
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Customers can insert their health logs"
  ON public.device_health_logs FOR INSERT
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Customers can view their health logs"
  ON public.device_health_logs FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Platform admins can manage all health logs"
  ON public.device_health_logs FOR ALL
  USING (is_platform_admin(auth.uid()));

-- RLS Policies: diagnostic_quizzes
CREATE POLICY "Centro owners can manage quizzes"
  ON public.diagnostic_quizzes FOR ALL
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Customers can manage their quizzes"
  ON public.diagnostic_quizzes FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Platform admins can manage all quizzes"
  ON public.diagnostic_quizzes FOR ALL
  USING (is_platform_admin(auth.uid()));

-- RLS Policies: device_health_alerts
CREATE POLICY "Centro owners can manage alerts"
  ON public.device_health_alerts FOR ALL
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Customers can view and respond to their alerts"
  ON public.device_health_alerts FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Customers can update their alert responses"
  ON public.device_health_alerts FOR UPDATE
  USING (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Platform admins can manage all alerts"
  ON public.device_health_alerts FOR ALL
  USING (is_platform_admin(auth.uid()));

-- RLS Policies: device_health_settings
CREATE POLICY "Centro owners can manage their settings"
  ON public.device_health_settings FOR ALL
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
  WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Customers can view centro settings for their loyalty card"
  ON public.device_health_settings FOR SELECT
  USING (centro_id IN (
    SELECT lc.centro_id FROM loyalty_cards lc 
    JOIN customers c ON lc.customer_id = c.id 
    WHERE c.email = (auth.jwt() ->> 'email') AND lc.status = 'active'
  ));

CREATE POLICY "Platform admins can manage all settings"
  ON public.device_health_settings FOR ALL
  USING (is_platform_admin(auth.uid()));

-- RLS Policies: customer_health_badges
CREATE POLICY "Centro owners can manage badges"
  ON public.customer_health_badges FOR ALL
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

CREATE POLICY "Customers can view their badges"
  ON public.customer_health_badges FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Platform admins can manage all badges"
  ON public.customer_health_badges FOR ALL
  USING (is_platform_admin(auth.uid()));

-- Trigger per updated_at
CREATE TRIGGER update_device_health_settings_updated_at
  BEFORE UPDATE ON public.device_health_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Funzione per calcolare health score
CREATE OR REPLACE FUNCTION public.calculate_device_health_score(
  p_battery_level INTEGER,
  p_battery_health TEXT,
  p_storage_percent_used NUMERIC,
  p_ram_percent_used NUMERIC
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score INTEGER := 100;
  v_battery_score INTEGER;
  v_storage_score INTEGER;
  v_ram_score INTEGER;
BEGIN
  -- Battery score (40% weight)
  v_battery_score := COALESCE(p_battery_level, 50);
  IF p_battery_health = 'dead' THEN v_battery_score := v_battery_score - 40;
  ELSIF p_battery_health = 'overheat' THEN v_battery_score := v_battery_score - 30;
  ELSIF p_battery_health = 'over_voltage' THEN v_battery_score := v_battery_score - 25;
  ELSIF p_battery_health = 'cold' THEN v_battery_score := v_battery_score - 15;
  ELSIF p_battery_health = 'unspecified_failure' THEN v_battery_score := v_battery_score - 20;
  END IF;
  v_battery_score := GREATEST(0, LEAST(100, v_battery_score));
  
  -- Storage score (30% weight)
  v_storage_score := 100 - COALESCE(p_storage_percent_used, 50)::INTEGER;
  v_storage_score := GREATEST(0, LEAST(100, v_storage_score));
  
  -- RAM score (30% weight)
  v_ram_score := 100 - COALESCE(p_ram_percent_used, 50)::INTEGER;
  v_ram_score := GREATEST(0, LEAST(100, v_ram_score));
  
  -- Weighted average
  v_score := (v_battery_score * 40 + v_storage_score * 30 + v_ram_score * 30) / 100;
  
  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;