-- Add corner referral tracking to loyalty_cards
ALTER TABLE public.loyalty_cards 
ADD COLUMN IF NOT EXISTS referred_by_corner_id UUID REFERENCES public.corners(id),
ADD COLUMN IF NOT EXISTS corner_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS corner_commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS corner_commission_paid_at TIMESTAMP WITH TIME ZONE;

-- Create table for corner loyalty invitations
CREATE TABLE IF NOT EXISTS public.corner_loyalty_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  corner_id UUID NOT NULL REFERENCES public.corners(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'paid', 'expired')),
  loyalty_card_id UUID REFERENCES public.loyalty_cards(id),
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.corner_loyalty_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for corners to manage their invitations
CREATE POLICY "Corners can view their own invitations"
ON public.corner_loyalty_invitations
FOR SELECT
USING (corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()));

CREATE POLICY "Corners can create invitations"
ON public.corner_loyalty_invitations
FOR INSERT
WITH CHECK (corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()));

CREATE POLICY "Corners can update their invitations"
ON public.corner_loyalty_invitations
FOR UPDATE
USING (corner_id IN (SELECT id FROM public.corners WHERE user_id = auth.uid()));

-- Policy for public access via invitation token (for checkout)
CREATE POLICY "Anyone can view invitation by token"
ON public.corner_loyalty_invitations
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_corner_loyalty_invitations_updated_at
BEFORE UPDATE ON public.corner_loyalty_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_corner_loyalty_invitations_corner_id ON public.corner_loyalty_invitations(corner_id);
CREATE INDEX IF NOT EXISTS idx_corner_loyalty_invitations_token ON public.corner_loyalty_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_corner_referral ON public.loyalty_cards(referred_by_corner_id);