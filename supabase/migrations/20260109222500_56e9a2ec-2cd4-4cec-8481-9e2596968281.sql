-- FASE 1: Pulizia Database Esistente

-- 1. Elimina lead senza email
DELETE FROM marketing_leads WHERE email IS NULL OR email = '' OR TRIM(email) = '';

-- 2. Elimina lead con nomi business invalidi
DELETE FROM marketing_leads 
WHERE LOWER(business_name) IN (
  'site map', 'sitemap', 'contatti', 'contact', 'home', 'about',
  'privacy', 'cookie', 'chi siamo', 'dove siamo', 'select data',
  'assistenza e supporto', 'centri di assistenza', 'pagina non trovata',
  'error', '404', 'not found', 'menu', 'footer', 'header'
)
OR business_name ILIKE 'Pec Tim%'
OR business_name ILIKE 'Pec Vodafone%'
OR business_name ILIKE 'Contatti -%'
OR business_name ILIKE '% - Contatti'
OR business_name ILIKE '% | Contatti'
OR business_name ILIKE 'Home -%'
OR business_name ILIKE '% - Home'
OR LENGTH(TRIM(business_name)) < 4;

-- 3. Elimina lead con email di sistema/corporate che non sono negozi reali
DELETE FROM marketing_leads 
WHERE LOWER(email) LIKE '%@tim.it'
   OR LOWER(email) LIKE '%@pec.tim.it'
   OR LOWER(email) LIKE '%@vodafone.it'
   OR LOWER(email) LIKE '%@pec.vodafone.it'
   OR LOWER(email) LIKE '%@wind.it'
   OR LOWER(email) LIKE '%@tre.it'
   OR LOWER(email) LIKE '%@fastweb.it'
   OR LOWER(email) LIKE '%@daikin.it'
   OR LOWER(email) LIKE '%@samsung.com'
   OR LOWER(email) LIKE '%@apple.com'
   OR LOWER(email) LIKE '%@microsoft.com'
   OR LOWER(email) LIKE '%@gov.it'
   OR LOWER(email) LIKE 'noreply@%'
   OR LOWER(email) LIKE 'no-reply@%'
   OR LOWER(email) LIKE 'donotreply@%'
   OR LOWER(email) LIKE 'mailer-daemon@%';

-- 4. Pulisci email multiple (prendi solo la prima)
UPDATE marketing_leads 
SET email = TRIM(SPLIT_PART(SPLIT_PART(email, ';', 1), ',', 1))
WHERE email LIKE '%;%' OR email LIKE '%,%';

-- 5. Normalizza email a lowercase
UPDATE marketing_leads SET email = LOWER(TRIM(email));

-- 6. Pulisci la coda email per lead senza email valida
DELETE FROM marketing_email_queue 
WHERE status IN ('skipped', 'failed')
   OR lead_id IN (
     SELECT id FROM marketing_leads WHERE email IS NULL OR email = ''
   );

-- 7. Rimuovi duplicati (mantieni il più recente per ogni email)
DELETE FROM marketing_leads a
USING marketing_leads b
WHERE a.id < b.id 
  AND LOWER(a.email) = LOWER(b.email);

-- 8. Elimina email dalla coda per lead eliminati
DELETE FROM marketing_email_queue 
WHERE lead_id NOT IN (SELECT id FROM marketing_leads);