
-- Create fulfillment status enum
CREATE TYPE public.auction_fulfillment_status AS ENUM ('pending', 'contacted', 'shipped', 'delivered', 'cancelled');

-- Create auction_sales table
CREATE TABLE public.auction_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
  auction_item_id UUID NOT NULL REFERENCES public.auction_items(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  product_description TEXT,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  winner_name TEXT NOT NULL,
  winner_email TEXT,
  winner_user_id UUID,
  fulfillment_status public.auction_fulfillment_status NOT NULL DEFAULT 'pending',
  fulfillment_notes TEXT,
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auction_sales ENABLE ROW LEVEL SECURITY;

-- Centro can see only their own sales
CREATE POLICY "Centro can view own sales"
ON public.auction_sales FOR SELECT
TO authenticated
USING (centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()));

-- Centro can insert own sales
CREATE POLICY "Centro can insert own sales"
ON public.auction_sales FOR INSERT
TO authenticated
WITH CHECK (centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()));

-- Centro can update own sales
CREATE POLICY "Centro can update own sales"
ON public.auction_sales FOR UPDATE
TO authenticated
USING (centro_id IN (SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()));

-- Platform admin can view all
CREATE POLICY "Platform admin can view all sales"
ON public.auction_sales FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));
