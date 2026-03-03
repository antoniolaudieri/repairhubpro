

## Sistema Aste Live stile Whatnot - Piano

### Panoramica
Creare una sezione "Aste Live" nel Centro dove ogni Centro può avviare sessioni di vendita live, mettendo all'asta i propri prodotti (usato, ricondizionati, accessori). I clienti vedono l'asta in tempo reale e fanno offerte. Il sistema usa Realtime per aggiornamenti istantanei delle offerte.

### Database - 3 nuove tabelle

**`live_auctions`** — La sessione live del Centro
- `id`, `centro_id` (FK centri_assistenza), `title`, `description`, `status` (enum: scheduled/live/ended/cancelled), `scheduled_at`, `started_at`, `ended_at`, `viewer_count` (default 0), `created_at`

**`auction_items`** — I prodotti messi all'asta in una sessione
- `id`, `auction_id` (FK live_auctions), `centro_id`, `title`, `description`, `image_url`, `starting_price`, `current_price`, `buy_now_price` (nullable), `status` (enum: pending/active/sold/unsold), `used_device_id` (FK used_devices, nullable — se collegato a un dispositivo usato), `winner_user_id` (nullable), `winner_name`, `winner_email`, `bid_count` (default 0), `started_at`, `ended_at`, `duration_seconds` (default 60), `created_at`

**`auction_bids`** — Le offerte dei partecipanti
- `id`, `item_id` (FK auction_items), `auction_id` (FK live_auctions), `user_id` (FK auth.users, nullable per ospiti), `bidder_name`, `bidder_email`, `amount`, `created_at`

- Realtime abilitato su `auction_items` e `auction_bids`
- RLS: Centro vede solo le proprie aste; utenti autenticati possono fare offerte; tutti possono leggere aste live

### Pagine e componenti

**1. Pagina Centro: `/centro/aste`** (`src/pages/centro/CentroAste.tsx`)
- Lista delle aste create dal Centro (scheduled, live, ended)
- Dialog per creare nuova asta (titolo, descrizione, data programmata)
- Per ogni asta: aggiungere prodotti con foto, prezzo di partenza, durata, eventuale "Compra Ora"
- Pulsante "Vai Live" per avviare la sessione
- **Console Live**: quando l'asta è attiva, il Centro vede in tempo reale le offerte, può passare al prodotto successivo, chiudere un lotto, vedere il conteggio spettatori

**2. Pagina Pubblica: `/aste/:auctionId`** (`src/pages/AstaLive.tsx`)
- Pagina pubblica (no login richiesto per guardare, login richiesto per fare offerte)
- Mostra il prodotto attualmente in asta con countdown timer
- Prezzo corrente che si aggiorna in realtime
- Lista offerte in tempo reale (stile chat)
- Pulsante "Fai Offerta" con incremento minimo (€5)
- Pulsante "Compra Ora" se disponibile
- Info sul Centro (nome, logo)
- Contatore spettatori live

**3. Sidebar Centro** — Aggiungere voce "Aste Live" con icona `Gavel`

**4. Route** — `/centro/aste` (protetta Centro) + `/aste/:auctionId` (pubblica)

### Componenti chiave

- `AuctionItemCard` — Card prodotto con countdown, prezzo attuale, numero offerte
- `BidFeed` — Feed realtime delle offerte (stile Whatnot)
- `AuctionControlPanel` — Panel per il Centro per controllare il flusso dell'asta live
- `CountdownTimer` — Riuso/adattamento del componente esistente per il timer del lotto

### Flusso operativo

```text
Centro crea asta → Aggiunge prodotti → "Vai Live"
    ↓
Prodotto 1 diventa "active" → Timer parte (es. 60s)
    ↓
Utenti vedono pagina pubblica → Fanno offerte in realtime
    ↓
Timer scade OPPURE Centro chiude lotto → Winner assegnato
    ↓
Centro passa a Prodotto 2 → Ripete
    ↓
Centro chiude sessione → Asta "ended"
```

### Storage
Riuso del bucket `marketing-images` per le foto dei prodotti all'asta (o upload da `used_devices` se collegato)

### File coinvolti
- **Migrazione SQL**: 3 tabelle + enums + RLS + realtime
- `src/pages/centro/CentroAste.tsx` — Gestione aste lato Centro
- `src/pages/AstaLive.tsx` — Pagina pubblica asta live
- `src/components/centro/CentroSidebar.tsx` — Nuova voce menu
- `src/components/AnimatedRoutes.tsx` — Nuove route

