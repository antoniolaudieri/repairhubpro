-- Add missing status 'waiting_for_device' to the constraint
ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS repairs_status_check;

ALTER TABLE public.repairs ADD CONSTRAINT repairs_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text,
    'assigned'::text,
    'quote_sent'::text,
    'quote_accepted'::text,
    'awaiting_pickup'::text,
    'picked_up'::text,
    'in_diagnosis'::text,
    'waiting_for_parts'::text,
    'waiting_parts'::text,
    'waiting_for_device'::text,
    'parts_arrived'::text,
    'in_repair'::text,
    'in_progress'::text,
    'repair_completed'::text,
    'ready_for_return'::text,
    'at_corner'::text,
    'delivered'::text,
    'completed'::text,
    'cancelled'::text,
    'forfeited'::text
  ])
);