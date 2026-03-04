

## Piano: Fix puntata + Chat nel Centro

### Problema 1: Swipe-to-Bid si blocca
Il componente `SwipeBidButton` usa drag gesture di framer-motion che è problematico su mobile (conflitti con scroll, touch impreciso). **Soluzione**: sostituirlo con un semplice bottone tap con conferma visiva animata — come un pulsante grande giallo "Offri €X" che al tap mostra un flash verde "✓ Inviata".

### Problema 2: Centro non vede la chat e non può rispondere
Il pannello Centro (`CentroAste.tsx`) mostra solo le offerte nel feed laterale, non i messaggi chat. **Soluzione**: unificare il feed del centro con offerte + chat (come lato pubblico), aggiungere un input per rispondere come "centro/host".

### Modifiche

**1. `src/pages/AstaLive.tsx`**
- Rimuovere `SwipeBidButton` (swipe drag)
- Sostituire con un bottone semplice: `<button>` grande giallo con "Offri: €{minBid}" che al tap chiama `placeBid(minBid)` con animazione di conferma
- Mantenere il bottone "Custom"

**2. `src/pages/centro/CentroAste.tsx`**
- Aggiungere stato `chatMessages` + fetch e realtime subscription su `auction_chat_messages`
- Nel feed laterale (colonna destra), mostrare sia offerte che messaggi chat unificati, ordinati per data
- Aggiungere input in basso al feed per inviare messaggi come centro (sender_name = nome centro)
- Aggiornare la RLS: il centro è autenticato quindi può già inserire messaggi

### File da modificare
- `src/pages/AstaLive.tsx` — rimuovere SwipeBidButton, aggiungere TapBidButton
- `src/pages/centro/CentroAste.tsx` — aggiungere chat nel feed + input risposta

