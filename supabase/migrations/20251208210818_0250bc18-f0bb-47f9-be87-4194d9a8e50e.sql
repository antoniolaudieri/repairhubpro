-- Add privacy consent timestamp to repairs table
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMP WITH TIME ZONE;