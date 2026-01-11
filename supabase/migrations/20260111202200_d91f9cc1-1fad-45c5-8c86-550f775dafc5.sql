-- Fase 1: Pulizia Database Completa

-- 1. Elimina lead con "email" che sono file immagine
DELETE FROM marketing_leads 
WHERE email LIKE '%.png' 
   OR email LIKE '%.svg' 
   OR email LIKE '%.jpg' 
   OR email LIKE '%.gif'
   OR email LIKE '%.webp'
   OR email LIKE '%.ico'
   OR email LIKE '%.jpeg'
   OR email LIKE '%.bmp';

-- 2. Elimina email in coda per lead che non esistono più
DELETE FROM marketing_email_queue 
WHERE lead_id NOT IN (SELECT id FROM marketing_leads);

-- 3. Resetta email bloccate in "processing" da più di 1 ora a "failed"
UPDATE marketing_email_queue 
SET status = 'failed', 
    error_message = 'Reset: stuck in processing for over 1 hour',
    updated_at = NOW()
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '1 hour';

-- 4. Elimina email pending per lead senza email valida
DELETE FROM marketing_email_queue 
WHERE lead_id IN (
  SELECT id FROM marketing_leads 
  WHERE email IS NULL 
     OR email = '' 
     OR email NOT LIKE '%@%.%'
);

-- 5. Elimina lead senza email valida (pulizia generale)
DELETE FROM marketing_leads 
WHERE email IS NULL 
   OR email = '' 
   OR email NOT LIKE '%@%.%';