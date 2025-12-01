-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create quotes table for estimates/preventivi
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL,
  device_brand TEXT,
  device_model TEXT,
  issue_description TEXT NOT NULL,
  diagnosis TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  valid_until DATE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Technicians and admins can manage quotes
CREATE POLICY "Technicians and admins can read quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can create quotes"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Technicians and admins can update quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'technician') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Customers can view their own quotes
CREATE POLICY "Customers can view own quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE email = auth.jwt()->>'email'
  )
);

-- Customers can update their own quotes (for signing)
CREATE POLICY "Customers can sign own quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE email = auth.jwt()->>'email'
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers WHERE email = auth.jwt()->>'email'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);