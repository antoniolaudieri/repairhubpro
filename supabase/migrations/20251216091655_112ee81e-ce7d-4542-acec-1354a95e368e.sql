-- Create forensic reports (perizie) table
CREATE TABLE public.forensic_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  
  -- Report details
  report_number TEXT NOT NULL,
  report_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  purpose TEXT NOT NULL, -- 'avvocato', 'polizia_postale', 'assicurazione', 'altro'
  recipient_name TEXT,
  recipient_role TEXT,
  
  -- Device analysis
  device_type TEXT NOT NULL,
  device_brand TEXT,
  device_model TEXT,
  device_serial TEXT,
  device_imei TEXT,
  device_condition TEXT,
  
  -- Findings
  analysis_summary TEXT NOT NULL,
  malware_check BOOLEAN DEFAULT FALSE,
  malware_findings TEXT,
  spyware_check BOOLEAN DEFAULT FALSE,
  spyware_findings TEXT,
  compromised_accounts_check BOOLEAN DEFAULT FALSE,
  compromised_accounts_findings TEXT,
  data_integrity_check BOOLEAN DEFAULT FALSE,
  data_integrity_findings TEXT,
  other_findings TEXT,
  
  -- Conclusions
  conclusions TEXT NOT NULL,
  recommendations TEXT,
  
  -- Technician
  technician_name TEXT NOT NULL,
  technician_qualification TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'finalized', 'sent'
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forensic_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Centro can view own forensic reports"
ON public.forensic_reports FOR SELECT
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro can create forensic reports"
ON public.forensic_reports FOR INSERT
WITH CHECK (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro can update own forensic reports"
ON public.forensic_reports FOR UPDATE
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

CREATE POLICY "Centro can delete own forensic reports"
ON public.forensic_reports FOR DELETE
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_forensic_reports_centro ON public.forensic_reports(centro_id);
CREATE INDEX idx_forensic_reports_customer ON public.forensic_reports(customer_id);

-- Add trigger for updated_at
CREATE TRIGGER update_forensic_reports_updated_at
BEFORE UPDATE ON public.forensic_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();