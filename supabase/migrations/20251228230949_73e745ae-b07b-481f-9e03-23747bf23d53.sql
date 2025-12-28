-- Popola i movimenti finanziari dai dati esistenti

-- 1. Riparazioni completate/consegnate
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  c.centro_id,
  'income'::financial_movement_type,
  COALESCE(r.final_cost, r.estimated_cost, 0),
  'Riparazioni',
  'Manodopera e Ricambi',
  CONCAT(
    d.brand, ' ', d.model, ' - ', 
    CASE r.status WHEN 'completed' THEN 'Completata' WHEN 'delivered' THEN 'Consegnata' ELSE r.status END
  ),
  'repair',
  r.id,
  COALESCE(r.completed_at, r.updated_at)::date,
  'cash'
FROM repairs r
JOIN devices d ON r.device_id = d.id
JOIN customers c ON d.customer_id = c.id
WHERE r.status IN ('completed', 'delivered')
  AND c.centro_id IS NOT NULL
  AND COALESCE(r.final_cost, r.estimated_cost, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'repair' AND cfm.reference_id = r.id
  );

-- 2. Acconti ricevuti
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  c.centro_id,
  'income'::financial_movement_type,
  r.acconto,
  'Acconti',
  'Riparazioni',
  CONCAT(d.brand, ' ', d.model, ' - Acconto'),
  'repair',
  r.id,
  r.created_at::date,
  'cash'
FROM repairs r
JOIN devices d ON r.device_id = d.id
JOIN customers c ON d.customer_id = c.id
WHERE r.acconto > 0
  AND c.centro_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'repair' AND cfm.reference_id = r.id AND cfm.category = 'Acconti'
  );

-- 3. Vendite dispositivi usati
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  ud.centro_id,
  'income'::financial_movement_type,
  ud.price,
  'Vendite Usato',
  ud.sale_type::text,
  CONCAT(ud.brand, ' ', ud.model, ' - Venduto'),
  'used_device',
  ud.id,
  ud.sold_at::date,
  'cash'
FROM used_devices ud
WHERE ud.status = 'sold'
  AND ud.centro_id IS NOT NULL
  AND ud.sold_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'used_device' AND cfm.reference_id = ud.id AND cfm.category = 'Vendite Usato'
  );

-- 4. Payout proprietari (conto vendita)
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  ud.centro_id,
  'expense'::financial_movement_type,
  ud.owner_payout,
  'Conto Vendita',
  'Payout Proprietario',
  CONCAT(ud.brand, ' ', ud.model, ' - Payout proprietario'),
  'used_device',
  ud.id,
  ud.sold_at::date,
  'transfer'
FROM used_devices ud
WHERE ud.status = 'sold'
  AND ud.centro_id IS NOT NULL
  AND ud.sale_type = 'conto_vendita'
  AND ud.owner_payout > 0
  AND ud.sold_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'used_device' AND cfm.reference_id = ud.id AND cfm.category = 'Conto Vendita'
  );

-- 5. Carte fedeltà attivate
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  lc.centro_id,
  'income'::financial_movement_type,
  COALESCE(lps.annual_price, 30),
  'Programma Fedeltà',
  'Attivazione Carta',
  CONCAT('Carta fedeltà #', LEFT(lc.id::text, 8)),
  'loyalty_card',
  lc.id,
  lc.activated_at::date,
  'card'
FROM loyalty_cards lc
LEFT JOIN loyalty_program_settings lps ON lc.centro_id = lps.centro_id
WHERE lc.status = 'active'
  AND lc.centro_id IS NOT NULL
  AND lc.activated_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'loyalty_card' AND cfm.reference_id = lc.id
  );

-- 6. Preventivi con acconto prepagato
INSERT INTO centro_financial_movements (centro_id, type, amount, category, subcategory, description, reference_type, reference_id, movement_date, payment_method)
SELECT 
  c.centro_id,
  'income'::financial_movement_type,
  q.commission_prepaid_amount,
  'Acconti',
  'Preventivi',
  CONCAT(q.device_brand, ' ', q.device_model, ' - Acconto'),
  'quote',
  q.id,
  q.commission_prepaid_at::date,
  'card'
FROM quotes q
JOIN customers c ON q.customer_id = c.id
WHERE q.commission_prepaid_amount > 0
  AND q.commission_prepaid_at IS NOT NULL
  AND c.centro_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM centro_financial_movements cfm 
    WHERE cfm.reference_type = 'quote' AND cfm.reference_id = q.id
  );