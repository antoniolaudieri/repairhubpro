

## Piano: Auto-proclamazione vincitore + Prezzo di riserva

### Cosa cambia

**1. Nuovo campo `reserve_price` nella tabella `auction_items`**
- Migrazione DB: `ALTER TABLE auction_items ADD COLUMN reserve_price numeric DEFAULT null`
- Il prezzo di riserva è opzionale. Se impostato, il prodotto può essere venduto solo se l'offerta più alta supera o eguaglia questo valore.

**2. Auto-chiusura allo scadere del countdown (CentroAste.tsx)**
- Quando il countdown raggiunge 0 nel componente `AuctionBroadcast` o nella logica centro, il sistema chiude automaticamente il lotto:
  - Se `current_price >= reserve_price` (o nessuna riserva): status → `sold`, assegna `winner_name`/`winner_email` dall'offerta più alta
  - Se `current_price < reserve_price`: status → `unsold` (riserva non raggiunta)
- Toast di notifica con il nome del vincitore o "Riserva non raggiunta"

**3. Auto-proclamazione vincitore lato cliente (AstaLive.tsx)**
- Quando il countdown arriva a 0, mostrare un overlay animato con il vincitore (nome + prezzo finale) oppure "Non venduto"
- Se `reserve_price` è presente e non raggiunto, mostrare "Prezzo di riserva non raggiunto"

**4. Campo "Prezzo di Riserva" nel form aggiungi prodotto (CentroAste.tsx)**
- Nuovo input nel dialog "Aggiungi Prodotto" tra "Compra Ora" e "Durata"
- Label: "Riserva (€)" con placeholder "Opzionale"
- Salvato nel campo `reserve_price`

**5. Indicatore riserva nella UI**
- Lato centro: mostrare se la riserva è impostata e se è stata raggiunta
- Lato cliente: mostrare solo "Prezzo di riserva" (senza rivelare il valore esatto) se presente

### File da modificare
- **Migrazione DB**: aggiungere colonna `reserve_price`
- **`src/pages/centro/CentroAste.tsx`**: form prodotto + logica auto-close al countdown 0 + useEffect countdown per item attivo
- **`src/pages/AstaLive.tsx`**: overlay vincitore al countdown 0
- **`src/components/centro/AuctionBroadcast.tsx`**: passare info countdown al parent o gestire auto-close

### Dettagli tecnici

La logica di auto-close sarà nel centro (CentroAste): un `useEffect` osserva il countdown dell'item attivo. Quando arriva a 0, chiama `closeItem()` automaticamente con la logica di riserva. Questo evita race condition perché solo il centro esegue la chiusura.

Lato pubblico, il client riceve l'aggiornamento via Realtime (`auction_items` UPDATE → status=sold/unsold) e mostra l'overlay vincitore.

