-- Add styling customization columns to display_ad_campaigns
ALTER TABLE public.display_ad_campaigns
ADD COLUMN IF NOT EXISTS ad_font TEXT DEFAULT 'sans',
ADD COLUMN IF NOT EXISTS ad_title_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS ad_description_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS ad_emoji TEXT DEFAULT '';