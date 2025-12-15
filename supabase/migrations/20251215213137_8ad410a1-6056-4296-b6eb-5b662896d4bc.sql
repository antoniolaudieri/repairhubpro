-- Add parts_arrived_at timestamp to repairs table
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS parts_arrived_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include all existing + new statuses
ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS repairs_status_check;
ALTER TABLE public.repairs ADD CONSTRAINT repairs_status_check 
CHECK (status IN ('pending', 'in_progress', 'waiting_parts', 'waiting_for_parts', 'parts_arrived', 'completed', 'delivered', 'cancelled', 'forfeited'));