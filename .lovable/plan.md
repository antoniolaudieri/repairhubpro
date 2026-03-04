

## Problema: Audio non funzionante per lo spettatore

Il problema è che il video viene avviato muted tramite `useEffect` (non un gesto utente). Quando l'utente clicca "Tocca per audio", viene impostato `muted = false` ma **senza richiamare `video.play()`**. I browser mobili (specialmente Safari/iOS) richiedono che `play()` con audio avvenga durante un gesto utente diretto.

## Fix

**File: `src/pages/AstaLive.tsx`**

1. **Bottone "Tocca per audio"** (riga ~661): aggiungere `video.play()` dopo aver impostato `muted = false`, così il play con audio avviene nel contesto del gesto utente
2. **useEffect stream** (riga ~588-600): avviare sempre muted (per evitare blocchi autoplay), poi lasciare all'utente l'unmute col bottone che chiama `play()`
3. Aggiungere `isMuted` alle dipendenze dell'effect per sincronizzare il prop `muted` del video con lo stato React quando cambia

Modifica minima, solo 2 punti nel file.

