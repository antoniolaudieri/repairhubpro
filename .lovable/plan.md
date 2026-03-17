

## Piano: Edge Function `whatsapp-repair-status` — Dati Cliente + Stato Riparazioni

La funzione non è ancora stata creata (il piano precedente era solo approvato in discussione). Creeremo l'edge function completa che, dato un numero di telefono, restituisce:

### Dati restituiti
1. **Dati cliente**: nome, email, telefono, indirizzo, note, data registrazione
2. **Riparazioni attive**: per ogni riparazione — dispositivo (marca, modello, tipo), stato con etichetta italiana, diagnosi, costo stimato/finale, date chiave
3. **Ordini associati**: tracking number e stato ordine se presente

### Implementazione

**Nuovo file**: `supabase/functions/whatsapp-repair-status/index.ts`
- Riceve `{ phone, api_key }` via POST
- Valida `api_key` contro secret `WHATSAPP_BOT_API_KEY`
- Cerca customer per `phone` (normalizzando il formato — rimuove spazi, gestisce +39)
- Query `devices` → `repairs` con join, ordinate per data
- Mappa stati: `pending` → "In Attesa", `in_progress` → "In Lavorazione", `waiting_for_parts` → "In Attesa Ricambi", `completed` → "Pronta per il Ritiro", `delivered` → "Consegnata"
- Restituisce JSON strutturato con tutti i dati

**Risposta esempio**:
```json
{
  "customer": {
    "name": "Mario Rossi",
    "email": "mario@email.com",
    "phone": "+393331234567",
    "address": "Via Roma 1, Milano",
    "registered_since": "2025-01-15"
  },
  "repairs": [
    {
      "device": "iPhone 14 Pro",
      "device_type": "smartphone",
      "issue": "Schermo rotto",
      "status": "in_progress",
      "status_label": "In Lavorazione 🔧",
      "diagnosis": "Display da sostituire",
      "estimated_cost": 120,
      "final_cost": null,
      "created_at": "2026-03-10",
      "tracking": null
    }
  ],
  "total_repairs": 3
}
```

**Config**: Aggiungere `[functions.whatsapp-repair-status] verify_jwt = false` in `config.toml`

**Secret**: Richiedere `WHATSAPP_BOT_API_KEY` all'utente per autenticare le chiamate dal bot

### File da creare/modificare
1. `supabase/functions/whatsapp-repair-status/index.ts` — Logica completa
2. `supabase/config.toml` — Registrazione funzione (automatico)

