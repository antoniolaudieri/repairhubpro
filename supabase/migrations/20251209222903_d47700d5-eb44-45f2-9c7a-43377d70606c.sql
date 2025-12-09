-- Create customer_notifications table for in-app notifications
CREATE TABLE public.customer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_email TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

-- Customers can view their own notifications
CREATE POLICY "Customers can view own notifications"
ON public.customer_notifications
FOR SELECT
USING (customer_email = (auth.jwt() ->> 'email'::text));

-- Customers can update (mark as read) their own notifications
CREATE POLICY "Customers can update own notifications"
ON public.customer_notifications
FOR UPDATE
USING (customer_email = (auth.jwt() ->> 'email'::text));

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.customer_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;

-- Add index for faster lookups
CREATE INDEX idx_customer_notifications_email ON public.customer_notifications(customer_email);
CREATE INDEX idx_customer_notifications_read ON public.customer_notifications(read) WHERE read = false;