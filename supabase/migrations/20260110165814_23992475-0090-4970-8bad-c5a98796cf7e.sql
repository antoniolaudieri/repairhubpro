-- FASE 1: Pulizia database email invalide

-- 1. Elimina lead con email @mhtml.blink (frame di cache browser)
DELETE FROM marketing_leads 
WHERE email LIKE '%@mhtml.blink%';

-- 2. Elimina lead con email placeholder
DELETE FROM marketing_leads 
WHERE email IN ('nome@gmail.com', 'email@example.com', 'test@test.com', 'info@info.com');

-- 3. Pulisci coda email per lead senza email o inesistenti
DELETE FROM marketing_email_queue 
WHERE lead_id NOT IN (SELECT id FROM marketing_leads);

DELETE FROM marketing_email_queue 
WHERE lead_id IN (
  SELECT id FROM marketing_leads WHERE email IS NULL OR email = ''
);

-- 4. Cancella email in coda per lead con email invalide
DELETE FROM marketing_email_queue 
WHERE lead_id IN (
  SELECT id FROM marketing_leads 
  WHERE email LIKE '%@mhtml.blink%' 
     OR email IN ('nome@gmail.com', 'email@example.com', 'test@test.com')
);

-- 5. Reset email bloccate in "processing" a "failed"
UPDATE marketing_email_queue 
SET status = 'failed', error_message = 'Reset: stuck in processing state'
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '1 hour';

-- 6. Crea funzione di validazione email
CREATE OR REPLACE FUNCTION is_valid_marketing_email(email_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Null o vuoto
  IF email_value IS NULL OR email_value = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Pattern email base
  IF email_value !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Blocca pattern @mhtml.blink (cache browser)
  IF email_value LIKE '%@mhtml.blink%' THEN
    RETURN FALSE;
  END IF;
  
  -- Blocca email placeholder
  IF email_value IN ('nome@gmail.com', 'email@example.com', 'test@test.com', 'info@info.com') THEN
    RETURN FALSE;
  END IF;
  
  -- Blocca prefissi di sistema
  IF email_value ~* '^(noreply|no-reply|mailer-daemon|postmaster|webmaster)@' THEN
    RETURN FALSE;
  END IF;
  
  -- Email troppo corta
  IF LENGTH(email_value) < 6 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 7. Aggiungi constraint CHECK sulla colonna email dei lead
-- (usa la funzione per validare le nuove email)
ALTER TABLE marketing_leads 
DROP CONSTRAINT IF EXISTS check_valid_email;

ALTER TABLE marketing_leads
ADD CONSTRAINT check_valid_email 
CHECK (email IS NULL OR is_valid_marketing_email(email));