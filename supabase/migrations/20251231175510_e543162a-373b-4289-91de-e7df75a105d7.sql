-- Create print queue table for remote printing
CREATE TABLE public.print_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centro_id UUID NOT NULL REFERENCES public.centri_assistenza(id) ON DELETE CASCADE,
  label_type TEXT NOT NULL DEFAULT 'repair', -- repair, device, shelf
  label_data JSONB NOT NULL, -- Contains all data needed to generate the label
  label_xml TEXT, -- Pre-generated label XML (optional)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, printing, completed, failed
  printer_name TEXT, -- Which printer printed it
  copies INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more urgent
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  printed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;

-- Centro owners and collaborators can manage their print queue
CREATE POLICY "Centro can manage their print queue"
  ON public.print_queue
  FOR ALL
  USING (
    centro_id IN (
      SELECT id FROM public.centri_assistenza WHERE owner_user_id = auth.uid()
    )
    OR
    public.is_centro_collaborator(auth.uid(), centro_id)
  );

-- Index for efficient polling
CREATE INDEX idx_print_queue_pending ON public.print_queue(centro_id, status, created_at) 
  WHERE status = 'pending';

-- Enable realtime for print queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_queue;