

## Aggiornamento Template Email + Meccanismo Condivisione

### Cosa cambia

**1. Aggiornare tutti e 4 i template email** in `CentroRicondizionatiTab.tsx`:
- Aggiungere istruzioni chiare: **"Inserisci il codice EVLZBANT al checkout e clicca Applica"** per ricevere lo sconto di 10€
- Rimuovere il testo generico "Il coupon verrà copiato automaticamente" e sostituirlo con istruzioni esplicite passo-passo

**2. Aggiungere sezione "Condividi con un amico"** in ogni template:
- Blocco visivo sotto il CTA principale con messaggio: "Non ti interessa? Condividilo con un amico!"
- Spiegazione: lo sconto è **illimitato, senza scadenza** — vale sia per chi condivide sia per chi lo riceve
- Pulsante/link "Inoltra questa email" (`mailto:?subject=...&body=...`) per condividere facilmente
- Testo: "Più persone lo usano, più tutti risparmiano!"

**3. Aggiornare anche la pagina PromoRedirect** (`src/pages/PromoRedirect.tsx`):
- Aggiungere istruzioni esplicite: "Inserisci il codice al checkout e clicca Applica"
- Aggiungere sezione condivisione con pulsante "Condividi con un amico" che usa `navigator.share()` (mobile) o copia link

### File coinvolti
- `src/components/centro/marketing/CentroRicondizionatiTab.tsx` — tutti i template HTML
- `src/pages/PromoRedirect.tsx` — pagina di redirect con istruzioni e condivisione

