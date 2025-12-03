-- Add DELETE policy for orders table
CREATE POLICY "Technicians and admins can delete orders" 
ON public.orders 
FOR DELETE 
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));

-- Add DELETE policy for order_items table
CREATE POLICY "Technicians and admins can delete order_items" 
ON public.order_items 
FOR DELETE 
USING (has_role(auth.uid(), 'technician') OR has_role(auth.uid(), 'admin'));