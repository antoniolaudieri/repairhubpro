

## Piano: Copertina Asta (Cover Image)

### Cosa faremo
Aggiungere la possibilità per il Centro di caricare un'immagine di copertina per ogni asta. Questa immagine verrà mostrata come sfondo nella pagina `AstaLive` quando l'asta non è ancora live (stato `scheduled`) o è terminata (`ended`), al posto dell'attuale placeholder generico.

### Modifiche

**1. Migrazione DB**
- Aggiungere colonna `cover_url TEXT` alla tabella `live_auctions`

**2. CentroAste.tsx — Form "Crea Nuova Asta"**
- Aggiungere campo upload immagine copertina con preview nel dialog di creazione asta
- Upload su bucket `auction-images` (già esistente), path: `covers/{auction_id}`
- Salvare URL pubblico in `cover_url`
- Permettere anche di cambiare la copertina dopo la creazione (nella vista dettaglio asta)

**3. CentroAste.tsx — Lista aste**
- Mostrare thumbnail della copertina nella card di ogni asta nella lista

**4. AstaLive.tsx — Sfondo offline**
- Quando `auction.status !== "live"` e non c'è stream attivo, mostrare `auction.cover_url` come sfondo a tutto schermo con overlay scuro e info asta
- Se non c'è copertina, mantenere il placeholder attuale
- Quando l'asta è `scheduled`, sovrapporre un countdown alla data programmata con design premium

### Dettagli grafici
- Copertina full-bleed con overlay gradiente nero dal basso (70% opacità)
- Logo centro + titolo asta centrati sopra la copertina
- Se scheduled: badge "Prossimamente" con data/ora e effetto blur/glass
- Se ended: overlay con "Asta Terminata" e statistiche finali (totale venduto, lotti)
- Transizione smooth dalla copertina allo stream quando si va live

### File da modificare
- Migrazione SQL (nuova colonna `cover_url`)
- `src/pages/centro/CentroAste.tsx` — Upload copertina nel form + thumbnail lista
- `src/pages/AstaLive.tsx` — Rendering copertina come sfondo offline

