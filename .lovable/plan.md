

## Piano: Chat Live Sempre Attiva + Avatar Utente + Aste Vinte in Dashboard

### Problema 1: La chat funziona solo con asta attiva

In `AstaLive.tsx` riga 888, la chat input viene mostrata solo se `isLive` e i bid controls (riga 1011) solo se `isLive && activeItem`. La chat dovrebbe essere disponibile anche quando l'asta è live ma non c'è un prodotto attivo, e idealmente anche in stato `scheduled` (sala d'attesa).

**Fix**:
- Mostrare la chat input quando `isLive` (già così) ma anche quando `auction.status === "scheduled"` — sala d'attesa pre-asta
- Il feed chat (riga 862-882) è già visibile sempre, il problema è solo l'input che è gated da `isLive`
- Separare la condizione: chat sempre visibile se l'asta esiste (live o scheduled), bid controls solo se `isLive && activeItem`

### Problema 2: Avatar utente + chi si collega

Attualmente i partecipanti non hanno avatar — vengono mostrati solo come iniziale in un cerchio colorato. Serve:

**DB**: Aggiungere colonna `avatar_url TEXT` alla tabella `auction_chat_messages` e `auction_bids` (per persistere l'avatar scelto).

**Selezione avatar nel viewer** (`AstaLive.tsx`):
- Quando l'utente si registra/accede, mostrare un set di avatar predefiniti (emoji/icone) da scegliere
- Salvare la scelta in localStorage e inviarla con ogni messaggio chat e bid
- Mostrare l'avatar nel feed chat, nella leading bidder bar, e nel winner overlay

**Presenza visibile**: Usare il Presence channel già attivo per mostrare gli avatar dei partecipanti connessi nell'header (tipo Whatnot — fila di avatar circolari).

### Problema 3: Aste vinte nella dashboard clienti

La tabella `auction_sales` ha già `winner_user_id`. Serve:

**In `CustomerDashboard.tsx`**:
- Aggiungere una sezione "Le Mie Aste Vinte" / "I Miei Acquisti Aste"
- Query: `supabase.from("auction_sales").select("*").eq("winner_user_id", user.id)`
- Mostrare: titolo prodotto, prezzo pagato, data, stato fulfillment (spedito, consegnato, etc.)
- Card con immagine prodotto (da `product_description` o join con `auction_items.image_url`)

### File da modificare

1. **Migrazione SQL**: Aggiungere `avatar_url TEXT` a `auction_chat_messages` e `auction_bids`
2. **`src/pages/AstaLive.tsx`**:
   - Chat input visibile anche in scheduled (sala d'attesa)
   - Avatar picker (griglia di avatar predefiniti) nel flow di primo accesso
   - Avatar nei feed bubble, leading bidder, winner overlay
   - Lista avatar partecipanti connessi nell'header (da Presence state)
3. **`src/pages/CustomerDashboard.tsx`**: Nuova sezione "Aste Vinte" con lista acquisti da `auction_sales`

### Dettagli tecnici
- Avatar predefiniti: set di 12-16 emoji avatar (🐱🐶🦊🐸🐵🐼🦁🐯🐷🐻🐰🐨🦄🐙🐝🐲) come semplice stringa emoji — nessun upload necessario
- Presence payload esteso: `{ type: "viewer", name: "...", avatar: "🐱" }` per mostrare chi è connesso
- RLS su `auction_sales`: verificare che esista una policy SELECT per `winner_user_id = auth.uid()`

