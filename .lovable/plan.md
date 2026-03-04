

## Piano: Fix Real-time Offerte + Prodotti con Immagine e Caratteristiche

### Problema 1: Prezzo resta a 0

Il problema è una race condition: quando arriva un'offerta, il realtime handler su `auction_items` (riga 237) chiama `fetchItems()` che ri-legge dal DB. Se il DB update da `placeBid` (in AstaLive.tsx riga 661-664) non è ancora committed, `fetchItems` legge il vecchio valore (0). Inoltre il realtime handler su `auction_bids` (riga 226-228) aggiorna lo state locale, ma subito dopo viene sovrascritto dal `fetchItems` del secondo handler.

**Fix**: Nel handler realtime di `auction_bids` INSERT (riga 222-229), aggiungere un piccolo delay (500ms) prima di chiamare `fetchItems` per dare tempo al DB di aggiornare `auction_items`. Inoltre, nel handler `auction_items` change (riga 237-238), usare direttamente il payload.new per aggiornare lo state locale invece di ri-fetchare tutto, evitando sovrascritture.

### Problema 2: Prodotti senza immagine e pochi dettagli

Il campo `image_url` esiste già nella tabella `auction_items` ma non viene usato nel form di aggiunta prodotto ne nella visualizzazione.

**Cambiamenti**:
- Aggiungere **upload immagine** nel dialog "Aggiungi Prodotto" con preview
- Aggiungere campi: **condizione**, **brand**, **modello**, **colore**, **storage/capacità**, **accessori inclusi**
- Salvare le caratteristiche extra come JSON nel campo `description` o creare un campo strutturato
- Mostrare **thumbnail immagine** nelle card prodotto
- Nel Hero dell'item attivo, mostrare l'**immagine grande** del prodotto

### Problema 3: Grafica spettacolare

- Card prodotto con **immagine prominente** (aspect-ratio 4:3)
- Badge caratteristiche colorati (brand, condizione, storage)
- Hero item attivo con layout **immagine + info side-by-side** su desktop
- Gradient e glass effects sulle card prodotto
- Animazioni di ingresso più elaborate

### File da modificare
- `src/pages/centro/CentroAste.tsx` — Fix realtime, form prodotto arricchito, UI prodotti con immagine, hero ridisegnato

### Dettagli tecnici
- Upload immagine via Supabase Storage (bucket `auction-images`)
- Caratteristiche prodotto salvate nel campo `description` come testo strutturato (non serve migrazione DB, `image_url` già esiste)
- Potrebbe servire **una migrazione** per creare il bucket storage + policy
- Fallback: se no immagine, mostrare placeholder con icona Package

