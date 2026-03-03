
-- Enums for auction status
CREATE TYPE public.auction_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
CREATE TYPE public.auction_item_status AS ENUM ('pending', 'active', 'sold', 'unsold');

-- Live auctions table
CREATE TABLE public.live_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status auction_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auction items table
CREATE TABLE public.auction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  starting_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC NOT NULL DEFAULT 0,
  buy_now_price NUMERIC,
  status auction_item_status NOT NULL DEFAULT 'pending',
  used_device_id UUID REFERENCES public.used_devices(id),
  winner_user_id UUID,
  winner_name TEXT,
  winner_email TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auction bids table
CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.auction_items(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
  user_id UUID,
  bidder_name TEXT NOT NULL,
  bidder_email TEXT,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read live/ended auctions
CREATE POLICY "Anyone can view live auctions" ON public.live_auctions
  FOR SELECT USING (status IN ('live', 'ended'));

-- RLS: Centro owners can manage their own auctions
CREATE POLICY "Centro owners manage own auctions" ON public.live_auctions
  FOR ALL TO authenticated
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
  WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

-- RLS: Centro collaborators can view auctions
CREATE POLICY "Centro collaborators view auctions" ON public.live_auctions
  FOR SELECT TO authenticated
  USING (public.is_centro_collaborator(auth.uid(), centro_id));

-- RLS: Anyone can view items of live/ended auctions
CREATE POLICY "Anyone can view auction items" ON public.auction_items
  FOR SELECT USING (auction_id IN (SELECT id FROM live_auctions WHERE status IN ('live', 'ended')));

-- RLS: Centro owners manage their items
CREATE POLICY "Centro owners manage own items" ON public.auction_items
  FOR ALL TO authenticated
  USING (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()))
  WITH CHECK (centro_id IN (SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()));

-- RLS: Anyone can view bids on live auctions
CREATE POLICY "Anyone can view bids" ON public.auction_bids
  FOR SELECT USING (auction_id IN (SELECT id FROM live_auctions WHERE status IN ('live', 'ended')));

-- RLS: Authenticated users can place bids
CREATE POLICY "Authenticated users can bid" ON public.auction_bids
  FOR INSERT TO authenticated
  WITH CHECK (auction_id IN (SELECT id FROM live_auctions WHERE status = 'live'));

-- RLS: Centro owners can manage bids on their auctions
CREATE POLICY "Centro owners manage bids" ON public.auction_bids
  FOR ALL TO authenticated
  USING (auction_id IN (SELECT la.id FROM live_auctions la JOIN centri_assistenza ca ON la.centro_id = ca.id WHERE ca.owner_user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;
