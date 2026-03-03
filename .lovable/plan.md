

## Problemi identificati dall'immagine

1. **Centro non vede il proprio video**: Il `videoRef` nel broadcast mostra schermo nero. Il video preview locale non si aggiorna correttamente dopo il `startBroadcast`.

2. **Cliente: video spostato/tagliato con controlli nativi**: Il `<video>` ha `controls` e layout `aspect-[4/3]` che causa il riquadro spostato. Va rimosso `controls`, usato layout fullwidth e object-cover centrato.

3. **Contatore spettatori incoerente**: Il `viewer_count` nel DB viene incrementato/decrementato ad ogni mount/unmount della pagina pubblica (anche refresh), causando numeri gonfiati. Il `viewerConnections` nel WebRTC è separato dal `viewer_count`. Servono due fix:
   - Usare solo il contatore WebRTC reale per le connessioni attive
   - Sostituire il sistema di increment/decrement con Supabase Realtime Presence per un conteggio accurato

---

## Piano di implementazione

### 1. Fix video lato Centro (AuctionBroadcast.tsx)
- Dopo `startBroadcast()`, assicurarsi che `videoRef.current.srcObject = stream` venga eseguito immediatamente con il MediaStream restituito
- Aggiungere un `useEffect` che osserva `isStreaming` e riattacca lo stream se necessario

### 2. Fix video lato Cliente (AstaLive.tsx)
- Rimuovere `controls` dal tag `<video>` (elimina play/pause/scrubber nativi)
- Cambiare layout video da `aspect-[4/3]` con max-height a un container fullwidth `w-full` con `aspect-video` e `object-cover` centrato
- Rimuovere `muted` dopo il primo play (o lasciare unmute button) per permettere l'audio
- Aggiungere un bottone custom "Tocca per attivare audio" per Safari/iPad

### 3. Fix contatore spettatori (viewer_count)
- **Rimuovere** il sistema di increment/decrement manuale nel `useEffect` di AstaLive.tsx (righe 238-265) che è inaffidabile
- **Implementare Supabase Realtime Presence** nel canale `public-auction-{id}`:
  - Lato viewer: `channel.track({ user_id, type: 'viewer' })` 
  - Contare i presenze attive con `presenceState()` 
- Lato Centro: usare lo stesso canale Presence per mostrare il numero reale di spettatori connessi
- Rimuovere la distinzione confusa tra "connessi" e "spettatori" — mostrare un unico numero "spettatori"

### 4. Miglioramento layout mobile cliente
- Video: occupare tutta la larghezza senza bordi, aspect-ratio 16:9 con fallback
- Overlay prezzo/timer: mantenerli ma senza controlli video nativi
- Feed offerte: compatto sotto il video

### File da modificare
- `src/pages/AstaLive.tsx` — fix video viewer, rimuovere controls, Presence, layout
- `src/components/centro/AuctionBroadcast.tsx` — fix video locale, Presence, unificare contatore
- `src/hooks/useWebRTCBroadcast.ts` — assicurarsi che lo stream venga restituito correttamente
- `src/hooks/useWebRTCViewer.ts` — nessuna modifica necessaria

