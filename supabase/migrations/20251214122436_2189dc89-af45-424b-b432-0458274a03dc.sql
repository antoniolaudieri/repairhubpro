-- Add settings column to corners table for display ads configuration
ALTER TABLE public.corners 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;