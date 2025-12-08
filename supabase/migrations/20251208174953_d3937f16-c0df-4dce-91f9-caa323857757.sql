-- Create table for saved external shops (potential partners)
CREATE TABLE public.saved_external_shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  notes TEXT,
  contact_status TEXT NOT NULL DEFAULT 'pending',
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(centro_id, external_id)
);

-- Enable RLS
ALTER TABLE public.saved_external_shops ENABLE ROW LEVEL SECURITY;

-- Centro owners can manage their saved shops
CREATE POLICY "Centro owners can manage saved_external_shops"
ON public.saved_external_shops
FOR ALL
USING (centro_id IN (
  SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
));

-- Platform admins can view all
CREATE POLICY "Platform admins can view saved_external_shops"
ON public.saved_external_shops
FOR SELECT
USING (is_platform_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_saved_external_shops_updated_at
BEFORE UPDATE ON public.saved_external_shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();