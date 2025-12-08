-- Drop existing constraint and add new one with additional status
ALTER TABLE public.repairs DROP CONSTRAINT IF EXISTS repairs_status_check;

ALTER TABLE public.repairs ADD CONSTRAINT repairs_status_check 
CHECK (status IN ('pending', 'in_progress', 'waiting_for_parts', 'completed', 'delivered', 'cancelled'));