

## Piano: Miglioramento gestione aste Centro + registro vendite

### Problema attuale
1. La gestione aste dal centro è funzionale ma graficamente non coerente con le altre pagine Centro (manca `PageTransition`, stats cards in alto, layout più strutturato)
2. Non c'è un registro vendite strutturato — i prodotti venduti mostrano solo winner_name/email inline, senza un riepilogo per gestire le evasioni post-evento
3. Il feed live è piccolo e poco leggibile durante l'evento

### Modifiche previste

**1. Nuova tabella `auction_sales` (migration)**
Registra ogni vendita completata con tutti i dati necessari per l'evasione:
- `id`, `auction_id`, `auction_item_id`, `centro_id`
- `product_title`, `product_description`
- `sale_price`, `winner_name`, `winner_email`, `winner_user_id`
- `fulfillment_status` (enum: `pending`, `contacted`, `shipped`, `delivered`, `cancelled`)
- `fulfillment_notes`, `sold_at`, `fulfilled_at`
- RLS: centro vede solo le proprie vendite

**2. Registrazione automatica vendite nel codice**
Quando `closeItem(item, true)` chiude un item come "sold", inserire automaticamente un record in `auction_sales` con tutti i dati del vincitore e del prodotto.

**3. Redesign grafico `CentroAste.tsx`**
- Aggiungere `PageTransition` wrapper (come le altre pagine centro)
- **Stats cards in alto**: totale prodotti, venduti, fatturato asta, spettatori — stile coerente con CentroLavori
- **Sezione "Riepilogo Vendite"** post-asta (quando status=ended): tabella con prodotto, vincitore, prezzo, stato evasione, azioni (contattato/spedito/consegnato)
- **Feed live più grande** durante il live con countdown prominente sull'item attivo
- **Active item card** più grande e prominente con countdown timer visivo, prezzo corrente grande, contatore offerte animato
- **Badge evasione** colorati: pending=giallo, contacted=blu, shipped=arancione, delivered=verde, cancelled=rosso

**4. Gestione evasioni**
- Dropdown/bottoni per cambiare `fulfillment_status` direttamente dalla tabella vendite
- Campo note evasione editabile
- Filtro per stato evasione

### File da modificare
- **Migration SQL**: crea tabella `auction_sales` + enum `fulfillment_status` + RLS
- **`src/pages/centro/CentroAste.tsx`**: redesign completo con stats, riepilogo vendite, layout coerente, feed migliorato

### Struttura UI post-redesign

```text
┌─────────────────────────────────────────┐
│ 🔨 Aste Live                    [+ Asta]│
├──────┬──────┬──────┬──────┬─────────────┤
│ Tot  │Vendut│Incass│Spett.│             │
│  12  │  8   │€340  │ 45   │             │
├──────┴──────┴──────┴──────┴─────────────┤
│                                         │
│  [Broadcast + Feed Live]  │ [Prodotti]  │
│  countdown + chat + bids  │ item cards  │
│                           │ + controls  │
├─────────────────────────────────────────┤
│ 📦 Riepilogo Vendite (post-asta)       │
│ ┌───────┬────────┬──────┬───────┬─────┐│
│ │Prodot.│Vincit. │Prezzo│Stato  │Azioni││
│ │iPhone │Mario R.│€25   │🟡Pend.│[▼]  ││
│ │Galaxy │Luca B. │€18   │🟢Cons.│[▼]  ││
│ └───────┴────────┴──────┴───────┴─────┘│
└─────────────────────────────────────────┘
```

