-- Add corner_id and geolocation fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN corner_id uuid REFERENCES public.corners(id),
ADD COLUMN customer_latitude numeric,
ADD COLUMN customer_longitude numeric;

-- Enable realtime for appointments
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- RLS policy for Corners to view their appointments
CREATE POLICY "Corners can view their appointments"
ON public.appointments
FOR SELECT
USING (
  corner_id IN (
    SELECT id FROM public.corners WHERE user_id = auth.uid()
  )
);

-- RLS policy for Corners to update their appointments (confirm/reject)
CREATE POLICY "Corners can update their appointments"
ON public.appointments
FOR UPDATE
USING (
  corner_id IN (
    SELECT id FROM public.corners WHERE user_id = auth.uid()
  )
);

-- Create index for faster corner appointment lookups
CREATE INDEX idx_appointments_corner_id ON public.appointments(corner_id);