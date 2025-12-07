-- Add 'prepaid' to commission_ledger status constraint
ALTER TABLE commission_ledger 
DROP CONSTRAINT commission_ledger_status_check;

ALTER TABLE commission_ledger 
ADD CONSTRAINT commission_ledger_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'processed'::text, 'paid'::text, 'cancelled'::text, 'prepaid'::text]));