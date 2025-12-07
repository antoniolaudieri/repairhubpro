-- Drop the old constraint and create a new one with the additional type
ALTER TABLE credit_transactions 
DROP CONSTRAINT credit_transactions_transaction_type_check;

ALTER TABLE credit_transactions 
ADD CONSTRAINT credit_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY['topup'::text, 'commission_debit'::text, 'refund'::text, 'adjustment'::text, 'commission_prepaid'::text]));