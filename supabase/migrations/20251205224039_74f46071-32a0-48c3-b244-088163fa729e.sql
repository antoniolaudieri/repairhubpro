-- Drop the problematic RLS policies that access auth.users directly
DROP POLICY IF EXISTS "Customers can view their checklists" ON public.repair_checklists;
DROP POLICY IF EXISTS "Customers can view their checklist items" ON public.checklist_items;

-- Recreate policies using auth.jwt() instead of auth.users
CREATE POLICY "Customers can view their checklists" 
ON public.repair_checklists 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM repairs r
    JOIN devices d ON r.device_id = d.id
    JOIN customers c ON d.customer_id = c.id
    WHERE r.id = repair_checklists.repair_id 
    AND c.email = (auth.jwt() ->> 'email')
  )
);

CREATE POLICY "Customers can view their checklist items" 
ON public.checklist_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM repair_checklists rc
    JOIN repairs r ON rc.repair_id = r.id
    JOIN devices d ON r.device_id = d.id
    JOIN customers c ON d.customer_id = c.id
    WHERE rc.id = checklist_items.checklist_id 
    AND c.email = (auth.jwt() ->> 'email')
  )
);