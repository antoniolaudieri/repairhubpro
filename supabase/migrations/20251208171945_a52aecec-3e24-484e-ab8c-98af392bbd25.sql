-- Create partnership_invites table for managing collaboration requests
CREATE TABLE public.partnership_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL CHECK (from_type IN ('centro', 'corner')),
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ('centro', 'corner')),
  to_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(from_type, from_id, to_type, to_id)
);

-- Enable RLS
ALTER TABLE public.partnership_invites ENABLE ROW LEVEL SECURITY;

-- Centri can view invites they sent or received
CREATE POLICY "Centri can view their invites"
ON public.partnership_invites
FOR SELECT
USING (
  (from_type = 'centro' AND from_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  ))
  OR
  (to_type = 'centro' AND to_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  ))
);

-- Centri can insert invites from themselves
CREATE POLICY "Centri can send invites"
ON public.partnership_invites
FOR INSERT
WITH CHECK (
  from_type = 'centro' AND from_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  )
);

-- Corners can view invites they sent or received
CREATE POLICY "Corners can view their invites"
ON public.partnership_invites
FOR SELECT
USING (
  (from_type = 'corner' AND from_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  ))
  OR
  (to_type = 'corner' AND to_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  ))
);

-- Corners can send invites
CREATE POLICY "Corners can send invites"
ON public.partnership_invites
FOR INSERT
WITH CHECK (
  from_type = 'corner' AND from_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  )
);

-- Recipients can update invites (accept/decline)
CREATE POLICY "Recipients can respond to invites"
ON public.partnership_invites
FOR UPDATE
USING (
  (to_type = 'centro' AND to_id IN (
    SELECT id FROM centri_assistenza WHERE owner_user_id = auth.uid()
  ))
  OR
  (to_type = 'corner' AND to_id IN (
    SELECT id FROM corners WHERE user_id = auth.uid()
  ))
);

-- Platform admins can manage all invites
CREATE POLICY "Platform admins can manage all invites"
ON public.partnership_invites
FOR ALL
USING (is_platform_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_partnership_invites_from ON public.partnership_invites(from_type, from_id);
CREATE INDEX idx_partnership_invites_to ON public.partnership_invites(to_type, to_id);
CREATE INDEX idx_partnership_invites_status ON public.partnership_invites(status);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.partnership_invites;