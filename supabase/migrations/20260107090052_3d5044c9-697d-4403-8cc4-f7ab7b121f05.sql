-- Add missing status values to marketing_lead_status enum
ALTER TYPE marketing_lead_status ADD VALUE IF NOT EXISTS 'manual_contact';
ALTER TYPE marketing_lead_status ADD VALUE IF NOT EXISTS 'needs_enrichment';