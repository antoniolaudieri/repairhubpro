

## Piano: UI Whatnot-Style — Join Animations, Share Nativo, Sidebar Azioni, Shop Prodotti

Ispirandosi alle immagini di Whatnot condivise, queste sono le modifiche principali:

### 1. Messaggi "joined 👋" automatici
Quando un utente entra nell'asta (evento Presence sync), inserire automaticamente un messaggio nel feed chat locale (non salvato in DB) tipo `"{nome} joined 👋"`. Questo crea l'effetto visto nello screenshot con i messaggi di benvenuto animati.

### 2. Sidebar azioni destra (stile Whatnot)
Aggiungere una colonna verticale di pulsanti sul lato destro dello schermo sopra il video:
- **More** (⋯) — apre share dialog
- **Share** (↑) con badge del conteggio condivisioni (contatore locale)
- **Shop** (🛍) con badge del numero prodotti — apre il pannello shop

### 3. Share panel nativo (stile iOS)
Riprogettare `AuctionShareDialog` per assomigliare al share sheet di Whatnot:
- Card preview in alto con copertina/frame + nome centro + badge "Live"
- Sotto: griglia icone circolari — Copy Link, Messages (native share), IG Stories (link Instagram), Instagram, WhatsApp, Telegram
- Stile bottom-sheet con sfondo bianco e angoli arrotondati

### 4. Shop drawer (pannello prodotti)
Nuovo pannello a scomparsa (bottom sheet o drawer) che mostra tutti i prodotti dell'asta:
- Barra di ricerca in alto
- Filtri: Sort, Auction (attivi), Sold (venduti)
- Lista prodotti con immagine, titolo, quantità/condizione, prezzo corrente, numero bid
- Tap su un prodotto per evidenziarlo nel feed principale

### File da modificare
- **`src/pages/AstaLive.tsx`**: Tutte le modifiche UI — join messages nel feed, sidebar azioni, shop drawer, share dialog redesign

### Dettagli tecnici
- Join messages: tipo `FeedItem` con `type: "join"` renderizzato con avatar + "{name} joined 👋"
- Presenza: intercettare `join` event dal presence channel per generare join messages
- Shop drawer: usa `Dialog` o `vaul` (già installato) come bottom sheet
- Sidebar: posizionata `absolute right-3 bottom-[320px]` con icone circolari e label
- Contatore share: stato locale incrementato ad ogni condivisione completata

