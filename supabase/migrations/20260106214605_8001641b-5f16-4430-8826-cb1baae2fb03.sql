-- =============================================
-- FASE 1: Sistema Marketing Automatizzato
-- =============================================

-- Tabella zone di scansione automatica
CREATE TABLE public.marketing_scan_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius_km NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scan_frequency_hours INTEGER NOT NULL DEFAULT 24,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  next_scan_at TIMESTAMP WITH TIME ZONE,
  total_leads_found INTEGER NOT NULL DEFAULT 0,
  search_keywords TEXT[] DEFAULT ARRAY['riparazione telefoni', 'centro assistenza', 'telefonia'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella sequenze email automatiche
CREATE TABLE public.marketing_email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'centro' CHECK (target_type IN ('centro', 'corner', 'both')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_steps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella step delle sequenze
CREATE TABLE public.marketing_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.marketing_email_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  template_id UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE RESTRICT,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'always' CHECK (condition IN ('always', 'no_response', 'opened', 'not_opened', 'clicked', 'not_clicked')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_number)
);

-- Tabella coda email
CREATE TABLE public.marketing_email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE RESTRICT,
  sequence_id UUID REFERENCES public.marketing_email_sequences(id) ON DELETE SET NULL,
  step_number INTEGER,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled', 'skipped')),
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabella stadi del funnel
CREATE TABLE public.marketing_funnel_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  auto_advance_after_days INTEGER,
  auto_advance_to_stage_id UUID REFERENCES public.marketing_funnel_stages(id),
  auto_advance_condition TEXT CHECK (auto_advance_condition IN ('no_response', 'email_opened', 'email_clicked', 'time_elapsed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stage_order)
);

-- Tabella configurazione automazione
CREATE TABLE public.marketing_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  email_send_hours_start INTEGER NOT NULL DEFAULT 9,
  email_send_hours_end INTEGER NOT NULL DEFAULT 18,
  email_send_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  max_emails_per_day INTEGER NOT NULL DEFAULT 100,
  min_delay_between_emails_hours INTEGER NOT NULL DEFAULT 1,
  auto_scan_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_email_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_funnel_enabled BOOLEAN NOT NULL DEFAULT true,
  blacklisted_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  blacklisted_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aggiungi colonne a marketing_leads per automazione
ALTER TABLE public.marketing_leads 
ADD COLUMN IF NOT EXISTS current_sequence_id UUID REFERENCES public.marketing_email_sequences(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS funnel_stage_id UUID REFERENCES public.marketing_funnel_stages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS email_opens_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_clicks_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_processed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS scan_zone_id UUID REFERENCES public.marketing_scan_zones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sequence_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sequence_completed_at TIMESTAMP WITH TIME ZONE;

-- Tabella log automazione per debugging
CREATE TABLE public.marketing_automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  log_type TEXT NOT NULL CHECK (log_type IN ('scan', 'email', 'funnel', 'error', 'info')),
  message TEXT NOT NULL,
  details JSONB,
  lead_id UUID REFERENCES public.marketing_leads(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.marketing_scan_zones(id) ON DELETE SET NULL,
  email_queue_id UUID REFERENCES public.marketing_email_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDICI PER PERFORMANCE
-- =============================================

CREATE INDEX idx_marketing_scan_zones_active ON public.marketing_scan_zones(is_active, next_scan_at);
CREATE INDEX idx_marketing_email_queue_scheduled ON public.marketing_email_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_marketing_email_queue_lead ON public.marketing_email_queue(lead_id, status);
CREATE INDEX idx_marketing_email_queue_tracking ON public.marketing_email_queue(tracking_id);
CREATE INDEX idx_marketing_leads_sequence ON public.marketing_leads(current_sequence_id, current_step) WHERE current_sequence_id IS NOT NULL;
CREATE INDEX idx_marketing_leads_funnel ON public.marketing_leads(funnel_stage_id) WHERE funnel_stage_id IS NOT NULL;
CREATE INDEX idx_marketing_leads_auto ON public.marketing_leads(auto_processed, source);
CREATE INDEX idx_marketing_automation_logs_type ON public.marketing_automation_logs(log_type, created_at DESC);

-- =============================================
-- TRIGGER PER AGGIORNAMENTO AUTOMATICO
-- =============================================

-- Trigger per aggiornare total_steps nella sequenza
CREATE OR REPLACE FUNCTION public.update_sequence_total_steps()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketing_email_sequences
  SET total_steps = (
    SELECT COUNT(*) FROM public.marketing_sequence_steps 
    WHERE sequence_id = COALESCE(NEW.sequence_id, OLD.sequence_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.sequence_id, OLD.sequence_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sequence_steps_count
AFTER INSERT OR DELETE ON public.marketing_sequence_steps
FOR EACH ROW EXECUTE FUNCTION public.update_sequence_total_steps();

-- Trigger per calcolare next_scan_at
CREATE OR REPLACE FUNCTION public.update_next_scan_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_scanned_at IS NOT NULL THEN
    NEW.next_scan_at := NEW.last_scanned_at + (NEW.scan_frequency_hours || ' hours')::INTERVAL;
  ELSE
    NEW.next_scan_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_next_scan_at
BEFORE INSERT OR UPDATE OF last_scanned_at, scan_frequency_hours ON public.marketing_scan_zones
FOR EACH ROW EXECUTE FUNCTION public.update_next_scan_at();

-- Trigger per aggiornare updated_at su email_queue
CREATE TRIGGER update_email_queue_updated_at
BEFORE UPDATE ON public.marketing_email_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger per aggiornare updated_at su automation_settings
CREATE TRIGGER update_automation_settings_updated_at
BEFORE UPDATE ON public.marketing_automation_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.marketing_scan_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automation_logs ENABLE ROW LEVEL SECURITY;

-- Policy per platform_admin
CREATE POLICY "Platform admins can manage scan zones" ON public.marketing_scan_zones
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can manage email sequences" ON public.marketing_email_sequences
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can manage sequence steps" ON public.marketing_sequence_steps
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can manage email queue" ON public.marketing_email_queue
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can manage funnel stages" ON public.marketing_funnel_stages
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can manage automation settings" ON public.marketing_automation_settings
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "Platform admins can view automation logs" ON public.marketing_automation_logs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

-- =============================================
-- DATI INIZIALI
-- =============================================

-- Inserisci impostazioni di default
INSERT INTO public.marketing_automation_settings (id) VALUES (gen_random_uuid());

-- Inserisci stadi del funnel predefiniti
INSERT INTO public.marketing_funnel_stages (name, description, stage_order, color, icon, auto_advance_after_days, auto_advance_condition) VALUES
('Nuovo', 'Lead appena acquisito, non ancora contattato', 1, '#6b7280', 'UserPlus', NULL, NULL),
('Contattato', 'Primo contatto inviato, in attesa risposta', 2, '#3b82f6', 'Mail', 7, 'no_response'),
('Interessato', 'Ha aperto email o mostrato interesse', 3, '#10b981', 'Eye', NULL, NULL),
('Demo Richiesta', 'Ha richiesto una demo o più info', 4, '#f59e0b', 'Calendar', NULL, NULL),
('Negoziazione', 'In fase di trattativa', 5, '#8b5cf6', 'MessageSquare', NULL, NULL),
('Convertito', 'È diventato cliente', 6, '#22c55e', 'CheckCircle', NULL, NULL),
('Perso', 'Non interessato o non raggiungibile', 7, '#ef4444', 'XCircle', NULL, NULL);

-- Aggiorna stadi per auto-advance
UPDATE public.marketing_funnel_stages 
SET auto_advance_to_stage_id = (SELECT id FROM public.marketing_funnel_stages WHERE stage_order = 7)
WHERE stage_order = 2;

-- Marca stadi finali
UPDATE public.marketing_funnel_stages SET is_final = true WHERE stage_order IN (6, 7);

-- Assegna stage iniziale ai lead esistenti
UPDATE public.marketing_leads 
SET funnel_stage_id = (SELECT id FROM public.marketing_funnel_stages WHERE stage_order = 1)
WHERE funnel_stage_id IS NULL;

-- Inserisci sequenze email predefinite
INSERT INTO public.marketing_email_sequences (id, name, description, target_type, is_active) VALUES
('a1111111-1111-1111-1111-111111111111', 'Onboarding Centro Assistenza', 'Sequenza automatica per nuovi centri assistenza', 'centro', true),
('b2222222-2222-2222-2222-222222222222', 'Onboarding Corner', 'Sequenza automatica per nuovi corner', 'corner', true);

-- Inserisci step per sequenza Centro
INSERT INTO public.marketing_sequence_steps (sequence_id, step_number, template_id, delay_days, delay_hours, condition) VALUES
('a1111111-1111-1111-1111-111111111111', 1, (SELECT id FROM public.marketing_templates WHERE name = 'Primo Contatto Centro' LIMIT 1), 0, 0, 'always'),
('a1111111-1111-1111-1111-111111111111', 2, (SELECT id FROM public.marketing_templates WHERE name = 'Follow-up Demo' LIMIT 1), 3, 0, 'no_response'),
('a1111111-1111-1111-1111-111111111111', 3, (SELECT id FROM public.marketing_templates WHERE name = 'Follow-up Demo' LIMIT 1), 7, 0, 'no_response');

-- Inserisci step per sequenza Corner
INSERT INTO public.marketing_sequence_steps (sequence_id, step_number, template_id, delay_days, delay_hours, condition) VALUES
('b2222222-2222-2222-2222-222222222222', 1, (SELECT id FROM public.marketing_templates WHERE name = 'Primo Contatto Corner' LIMIT 1), 0, 0, 'always'),
('b2222222-2222-2222-2222-222222222222', 2, (SELECT id FROM public.marketing_templates WHERE name = 'WhatsApp Follow-up' LIMIT 1), 2, 0, 'no_response'),
('b2222222-2222-2222-2222-222222222222', 3, (SELECT id FROM public.marketing_templates WHERE name = 'WhatsApp Follow-up' LIMIT 1), 5, 0, 'no_response');