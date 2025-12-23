-- Add centro_id column to appointments table for direct Centro bookings (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='centro_id') THEN
    ALTER TABLE public.appointments ADD COLUMN centro_id UUID REFERENCES public.centri_assistenza(id);
    CREATE INDEX idx_appointments_centro_id ON public.appointments(centro_id);
  END IF;
END $$;

-- Create RLS policies for Centro (drop if exists first to avoid errors)
DROP POLICY IF EXISTS "Centro can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Centro can update their appointments" ON public.appointments;

CREATE POLICY "Centro can view their appointments" 
ON public.appointments 
FOR SELECT 
USING (
  centro_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  )
);

CREATE POLICY "Centro can update their appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  centro_id IN (
    SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
  )
);