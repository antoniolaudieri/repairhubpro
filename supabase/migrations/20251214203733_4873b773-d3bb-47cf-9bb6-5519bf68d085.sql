-- Enable realtime for display_ad_campaigns table
ALTER TABLE public.display_ad_campaigns REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.display_ad_campaigns;