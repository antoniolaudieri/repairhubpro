

## Redesign AstaLive in stile Whatnot

Dall'immagine di riferimento, la UI di Whatnot ha un layout completamente diverso dal nostro attuale: tutto è sovrapposto al video fullscreen. Nessuna sezione separata.

### Struttura target (ispirata a Whatnot)

```text
┌──────────────────────────┐
│  [Avatar] Nome  ★4.9  🔴 │  ← Header overlay trasparente
│         [LIVE] 👁 270    │
│                          │
│                          │
│  ┌─────────────┐         │  ← Video FULLSCREEN background
│  │ Chat bubble │         │
│  │ Chat bubble │         │
│  │ Chat bubble │         │
│  └─────────────┘         │
│                          │
│  [Say something...]      │  ← Input chat/commento
│                          │
│  🟢 user123 won!         │  ← Winner bar
│  ┌──────────────────────┐│
│  │[img] Prodotto  €9    ││  ← Product card overlay
│  │      Sold            ││
│  └──────────────────────┘│
│  ┌──────────────────────┐│
│  │  €25  │ +€5 │ +€10  ││  ← Bid buttons overlay
│  └──────────────────────┘│
└──────────────────────────┘
```

### Modifiche principali

**1. Layout fullscreen con video background**
- Container `h-[100dvh] w-full relative overflow-hidden bg-black`
- Video occupa l'intero schermo con `absolute inset-0 object-cover`
- Tutti gli altri elementi posizionati con `absolute` o `relative z-10` sopra il video

**2. Header overlay trasparente (top)**
- `absolute top-0 left-0 right-0 z-20` con gradiente `bg-gradient-to-b from-black/60 to-transparent`
- Logo centro + nome + badge LIVE + viewer count
- Stile: testo bianco, no background solido

**3. Feed offerte/chat (left side, middle)**
- `absolute left-0 bottom-[220px] z-20` con max-height limitato
- Bolle semi-trasparenti: `bg-black/40 backdrop-blur-sm rounded-2xl`
- Avatar + nome + importo offerta
- Scorrimento automatico verso il basso
- Stile Whatnot: bolle arrotondate con sfondo scuro traslucido

**4. Barra vincitore + product card (bottom area)**
- Quando un item è venduto/non venduto: riga colorata "username won!" con prezzo
- Product card: immagine thumbnail + titolo + prezzo + badge "Sold"/"Unsold"
- Background semi-trasparente

**5. Barra offerte (sticky bottom overlay)**
- `absolute bottom-0 left-0 right-0 z-30`
- Pulsanti grandi su sfondo `bg-black/60 backdrop-blur-xl`
- Bottoni: offerta minima + incrementi (+€5, +€10)
- Compra Ora se disponibile

**6. Countdown e prezzo attuale**
- Overlay in alto a destra o integrato nell'header
- Prezzo grande in basso sovrapposto al video (come ora ma integrato nel nuovo layout)

### Rimozioni
- Sezione "Prossimi" e "Venduti" orizzontali separate → integrate come card compatta nel bottom
- Header opaco con bordo → sostituito da overlay trasparente
- Sezione "Offerte Live" separata sulla destra → diventa il feed sovrapposto a sinistra
- Divisione `lg:flex-row` desktop → layout sempre portrait/mobile-first fullscreen

### File da modificare
- `src/pages/AstaLive.tsx` — riscrittura completa del layout render

