-- Add image_url column to spare_parts table
ALTER TABLE public.spare_parts
ADD COLUMN image_url TEXT;