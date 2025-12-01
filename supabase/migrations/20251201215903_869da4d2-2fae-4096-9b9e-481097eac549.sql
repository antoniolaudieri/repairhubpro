-- Add intake signature fields to repairs table
ALTER TABLE repairs 
ADD COLUMN intake_signature TEXT,
ADD COLUMN intake_signature_date TIMESTAMP WITH TIME ZONE;