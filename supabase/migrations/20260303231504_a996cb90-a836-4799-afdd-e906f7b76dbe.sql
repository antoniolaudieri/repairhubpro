
-- Chat messages for live auctions
CREATE TABLE public.auction_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.live_auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auction_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read chat messages (public auction)
CREATE POLICY "Anyone can read auction chat" ON public.auction_chat_messages
  FOR SELECT USING (true);

-- Authenticated users can insert chat messages
CREATE POLICY "Authenticated users can send chat" ON public.auction_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_auction_chat_auction_id ON public.auction_chat_messages(auction_id, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_chat_messages;
