-- Add customer_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);

-- Add RLS policy for customers to view their own orders (if not linked to repair)
CREATE POLICY "Customers can view orders linked to them directly"
ON public.orders
FOR SELECT
USING (customer_id IN (
  SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email'::text)
));