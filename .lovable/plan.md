

## Streaming Live per Aste — Webcam integrata + Stream esterno

### Cosa si aggiunge

**1. Console Centro (`CentroAste.tsx`)** — Quando l'asta è LIVE:
- **Sezione Video Broadcast** sopra i prodotti con due modalità:
  - **Webcam browser**: usa `navigator.mediaDevices.getUserMedia()` per attivare la camera. Il video viene mostrato in un `<video>` element con statistiche overlay (spettatori, timer lotto attivo, prezzo corrente)
  - **Stream esterno**: campo per incollare un URL YouTube Live / Twitch embed. Viene mostrato l'embed con le stesse statistiche overlay
- Toggle per passare tra le due modalità
- Pulsanti per attivare/disattivare la camera e il microfono
- **Overlay statistiche live**: spettatori in tempo reale, prodotto attivo, prezzo corrente animato, countdown timer, numero offerte — sempre visibile sopra il video

**2. Pagina Pubblica (`AstaLive.tsx`)** — Gli spettatori vedono:
- Se il Centro sta usando la webcam: lo stream non è peer-to-peer (non possiamo fare WebRTC senza un server TURN/STUN), quindi la webcam viene usata SOLO lato Centro come anteprima locale. Per gli spettatori, il prodotto attivo rimane la hero section con dati realtime
- Se il Centro ha inserito un URL stream esterno: viene mostrato un **iframe embed** (YouTube/Twitch) nella sezione principale sopra il pannello offerte
- **Dashboard statistiche live** sempre visibile: contatore spettatori animato, timer lotto, prezzo corrente con animazione di aggiornamento, numero offerte in tempo reale

**3. Database** — Aggiungere colonna `stream_url` a `live_auctions` per salvare l'URL dello stream esterno

**4. Viewer count realtime** — Il Centro vede il conteggio aggiornato tramite Supabase Realtime sulla tabella `live_auctions`

### Dettagli tecnici

- La webcam browser è solo un'anteprima locale per il Centro (mostra cosa riprende). Non c'è WebRTC/streaming P2P — per quello serve un servizio esterno
- L'embed esterno supporta YouTube (`youtube.com/embed/VIDEO_ID`) e Twitch (`player.twitch.tv/?channel=CHANNEL`)
- L'overlay statistiche usa i dati già presenti via Realtime (bids, items, viewer_count)
- Una migrazione SQL aggiunge `stream_url TEXT` alla tabella `live_auctions`

### File coinvolti
- **Migrazione SQL**: aggiunta colonna `stream_url` a `live_auctions`
- `src/pages/centro/CentroAste.tsx` — sezione broadcast con webcam + stream URL + overlay stats
- `src/pages/AstaLive.tsx` — embed stream + dashboard statistiche per spettatori

