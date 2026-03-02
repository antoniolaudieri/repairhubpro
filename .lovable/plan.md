

## Template Email con Immagini Custom - Piano

### Problema
I template attuali sono solo testo/HTML. Il Centro vuole aggiungere immagini personalizzate (es. banner, logo, foto prodotti) senza compromettere il recapito delle email.

### Approccio per la Deliverability
Le immagini **embedded** (base64 o allegati) aumentano il peso dell'email e vengono spesso bloccate dai filtri spam. La soluzione corretta è:
- **Hostare le immagini su un bucket pubblico** nel backend
- **Linkare via URL** nell'HTML dell'email (`<img src="https://...">`)
- Questo è lo stesso approccio usato da Mailchimp, SendGrid, ecc.

### Modifiche

**1. Storage: Creare bucket pubblico `marketing-images`**
- Migrazione SQL per creare il bucket con policy RLS per upload da utenti autenticati e lettura pubblica

**2. Nuovo template "Custom con Immagini"**
- Aggiungere un 4° template `custom_images` alla lista `EMAIL_TEMPLATES`
- Supporta: **banner header**, **immagine prodotto**, e **logo footer** — tutti opzionali
- Le immagini mancanti vengono semplicemente omesse dall'HTML (nessun placeholder rotto)

**3. UI Upload immagini nel dialog di creazione campagna**
- Quando si seleziona il template "Custom con Immagini", appaiono 3 campi upload:
  - Banner superiore (consigliato 600x200px)
  - Immagine prodotto centrale (consigliato 400x300px)
  - Logo footer (consigliato 150x50px)
- Upload via `supabase.storage.upload()` → URL pubblico via `getPublicUrl()`
- Anteprima live che si aggiorna quando si caricano le immagini

**4. Template HTML ottimizzato per deliverability**
- Immagini con attributi `alt`, `width`, `height` espliciti
- Fallback testuale se le immagini non vengono caricate dal client email
- Peso HTML < 100KB (soglia sicura per i filtri spam)
- Nessun allegato, nessun base64

### File coinvolti
- `src/components/centro/marketing/CentroRicondizionatiTab.tsx` — nuovo template + UI upload
- Migrazione SQL — bucket storage + policy

