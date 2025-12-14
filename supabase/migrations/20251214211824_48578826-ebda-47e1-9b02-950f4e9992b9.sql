-- Aggiungi colonna display_seconds per campagne pubblicitarie
ALTER TABLE public.display_ad_campaigns
ADD COLUMN display_seconds INTEGER NOT NULL DEFAULT 5;