-- Create enum for lead status
CREATE TYPE public.marketing_lead_status AS ENUM (
  'new', 'contacted', 'interested', 'demo_scheduled', 'converted', 'rejected'
);

-- Create enum for business type
CREATE TYPE public.marketing_business_type AS ENUM (
  'centro', 'corner', 'telefonia', 'elettronica', 'computer', 'altro'
);

-- Create enum for interaction type
CREATE TYPE public.marketing_interaction_type AS ENUM (
  'call', 'email', 'whatsapp', 'meeting', 'demo', 'note'
);

-- Create enum for interaction outcome
CREATE TYPE public.marketing_interaction_outcome AS ENUM (
  'positive', 'neutral', 'negative', 'no_response'
);

-- Create marketing_leads table
CREATE TABLE public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'manual',
  business_name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  phone TEXT,
  email TEXT,
  website TEXT,
  business_type public.marketing_business_type NOT NULL DEFAULT 'altro',
  status public.marketing_lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  contacted_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  converted_entity_type TEXT,
  converted_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create marketing_interactions table
CREATE TABLE public.marketing_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  interaction_type public.marketing_interaction_type NOT NULL,
  notes TEXT,
  outcome public.marketing_interaction_outcome,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create marketing_templates table
CREATE TABLE public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  target_type public.marketing_business_type,
  subject TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_leads (only platform admins)
CREATE POLICY "Platform admins can view all marketing leads"
ON public.marketing_leads FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert marketing leads"
ON public.marketing_leads FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update marketing leads"
ON public.marketing_leads FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete marketing leads"
ON public.marketing_leads FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- RLS Policies for marketing_interactions (only platform admins)
CREATE POLICY "Platform admins can view all marketing interactions"
ON public.marketing_interactions FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert marketing interactions"
ON public.marketing_interactions FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update marketing interactions"
ON public.marketing_interactions FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete marketing interactions"
ON public.marketing_interactions FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- RLS Policies for marketing_templates (only platform admins)
CREATE POLICY "Platform admins can view all marketing templates"
ON public.marketing_templates FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can insert marketing templates"
ON public.marketing_templates FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update marketing templates"
ON public.marketing_templates FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete marketing templates"
ON public.marketing_templates FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Create trigger to update last_interaction_at on marketing_leads
CREATE OR REPLACE FUNCTION public.update_lead_last_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE marketing_leads
  SET last_interaction_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_marketing_interaction_insert
AFTER INSERT ON public.marketing_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_last_interaction();

-- Create trigger to update contacted_at when status changes from 'new'
CREATE OR REPLACE FUNCTION public.update_lead_contacted_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'new' AND NEW.status != 'new' AND NEW.contacted_at IS NULL THEN
    NEW.contacted_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_marketing_lead_update
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_lead_contacted_at();

-- Insert default marketing templates with LinkRiparo value proposition
INSERT INTO public.marketing_templates (name, type, target_type, subject, content, sort_order) VALUES
('Primo Contatto Centro', 'email', 'centro', 'LinkRiparo: Il CRM che fa guadagnare di più il tuo centro assistenza', 
'Gentile {{business_name}},

Sono [Nome] di LinkRiparo, il primo CRM italiano progettato specificamente per far guadagnare di più i centri assistenza.

**Perché LinkRiparo è diverso:**
✅ Ricevi lavori automaticamente dalla rete di Corner
✅ Gestisci clienti, fidelizzazione e tessere fedeltà
✅ Monitora dispositivi e scopri opportunità di ricavo
✅ Analytics e reportistica avanzata inclusi

I nostri centri partner hanno aumentato il fatturato in media del 35% nel primo anno.

Posso mostrarti come funziona con una demo gratuita di 15 minuti?

Cordiali saluti,
[Nome]
Team LinkRiparo', 1),

('Primo Contatto Corner', 'email', 'corner', 'Guadagna commissioni senza riparare - Diventa Corner LinkRiparo', 
'Gentile {{business_name}},

Immagina di guadagnare commissioni su ogni riparazione senza doverla fare tu stesso.

Con **LinkRiparo** puoi diventare un Corner e:
✅ Guadagnare commissioni automatiche sulle segnalazioni
✅ Usare un''app semplice per inviare richieste
✅ Ricevere pagamenti tracciati e puntuali
✅ Accedere a una rete di centri assistenza qualificati

**Zero investimento iniziale. Zero rischio.**

Vuoi saperne di più? Rispondi a questa email o chiamami al [numero].

Cordiali saluti,
[Nome]
Team LinkRiparo', 2),

('Follow-up Demo', 'email', NULL, 'Come è andata la demo di LinkRiparo?', 
'Ciao {{business_name}},

Grazie per aver dedicato del tempo alla demo di LinkRiparo!

Volevo assicurarmi che tu abbia tutte le informazioni necessarie per prendere una decisione.

**Ricordi i vantaggi principali:**
• Sistema collaudato e già in uso da decine di centri
• Supporto dedicato per l''onboarding
• Nessun costo nascosto

Hai domande? Sono a tua disposizione.

Cordiali saluti,
[Nome]', 3),

('WhatsApp Primo Contatto', 'whatsapp', NULL, NULL, 
'Ciao! 👋 Sono [Nome] di LinkRiparo.

Ho visto la tua attività {{business_name}} e credo che potremmo aiutarti a guadagnare di più.

LinkRiparo è il primo CRM che collega centri assistenza e punti vendita in una rete che genera lavori automaticamente.

Posso spiegarti come funziona in 5 minuti? 📱', 4),

('WhatsApp Follow-up', 'whatsapp', NULL, NULL, 
'Ciao {{business_name}}! 

Ti scrivo per un follow-up sulla nostra conversazione di qualche giorno fa.

Hai avuto modo di valutare LinkRiparo? 🤔

Sono disponibile per rispondere a qualsiasi domanda!', 5);

-- Create index for faster queries
CREATE INDEX idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX idx_marketing_leads_business_type ON public.marketing_leads(business_type);
CREATE INDEX idx_marketing_leads_next_followup ON public.marketing_leads(next_followup_at);
CREATE INDEX idx_marketing_interactions_lead_id ON public.marketing_interactions(lead_id);