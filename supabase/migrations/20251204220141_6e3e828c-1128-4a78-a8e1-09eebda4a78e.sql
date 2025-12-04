-- Drop the existing status check constraint
ALTER TABLE public.repair_requests 
DROP CONSTRAINT IF EXISTS repair_requests_status_check;

-- Add new check constraint with all workflow statuses
ALTER TABLE public.repair_requests 
ADD CONSTRAINT repair_requests_status_check 
CHECK (status = ANY (ARRAY[
  'pending'::text, 
  'dispatching'::text, 
  'assigned'::text, 
  'quote_sent'::text,
  'quote_accepted'::text,
  'awaiting_pickup'::text,
  'picked_up'::text,
  'in_diagnosis'::text,
  'waiting_for_parts'::text,
  'in_repair'::text,
  'repair_completed'::text,
  'ready_for_return'::text,
  'at_corner'::text,
  'delivered'::text,
  'in_progress'::text, 
  'completed'::text, 
  'cancelled'::text
]));