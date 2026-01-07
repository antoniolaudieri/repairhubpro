-- Add DELETE policies for repair_history
CREATE POLICY "Centro admins can delete repair_history" 
ON public.repair_history 
FOR DELETE 
USING (public.has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Technicians and admins can delete repair_history" 
ON public.repair_history 
FOR DELETE 
USING (public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'admin'));

-- Add DELETE policies for commission_ledger
CREATE POLICY "Centro admins can delete commission_ledger" 
ON public.commission_ledger 
FOR DELETE 
USING (public.has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Admins can delete commission_ledger" 
ON public.commission_ledger 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Add DELETE policies for credit_transactions
CREATE POLICY "Centro admins can delete credit_transactions" 
ON public.credit_transactions 
FOR DELETE 
USING (public.has_role(auth.uid(), 'centro_admin'));

CREATE POLICY "Admins can delete credit_transactions" 
ON public.credit_transactions 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));