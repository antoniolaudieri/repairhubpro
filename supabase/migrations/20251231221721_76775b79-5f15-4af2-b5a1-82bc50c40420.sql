-- Add storage slot fields to repairs table
ALTER TABLE public.repairs 
ADD COLUMN IF NOT EXISTS storage_slot integer,
ADD COLUMN IF NOT EXISTS storage_slot_assigned_at timestamp with time zone;

-- Create index for faster slot lookups
CREATE INDEX IF NOT EXISTS idx_repairs_storage_slot ON public.repairs(storage_slot) WHERE storage_slot IS NOT NULL;

-- Create function to automatically release storage slot when repair is delivered
CREATE OR REPLACE FUNCTION public.release_storage_slot_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Release slot when status changes to 'delivered' or 'completed'
  IF NEW.status IN ('delivered', 'completed') AND OLD.status NOT IN ('delivered', 'completed') THEN
    NEW.storage_slot := NULL;
    NEW.storage_slot_assigned_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger to release slot on delivery
DROP TRIGGER IF EXISTS release_storage_slot_trigger ON public.repairs;
CREATE TRIGGER release_storage_slot_trigger
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.release_storage_slot_on_delivery();