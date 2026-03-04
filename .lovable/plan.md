

## Piano: Redesign completo della sezione Aste Live Centro

### Obiettivo
Rifare completamente la grafica e il layout della pagina CentroAste con un design dashboard moderno, dati in tempo reale senza refresh, e un'esperienza ottimizzata per mobile.

### Cambiamenti principali

**1. Stats Cards con design premium**
- Sostituire le card piatte con card glassmorphism animate, gradiente unico per ogni metrica
- Aggiungere animazione numerica (contatore che si incrementa) quando i valori cambiano in real-time
- Nuove metriche: tasso di vendita (%), offerta media, tempo medio per lotto

**2. Active Item Hero riprogettato**
- Layout a pannello centrale con prezzo gigante animato (scale + glow al cambio)
- Countdown circolare con progress ring SVG invece del testo semplice
- Barra di progresso visuale che mostra quanto manca alla riserva
- Pulsanti "Aggiudicato" e "Skip" più grandi e prominenti su mobile

**3. Feed Live completamente ridisegnato**
- Header con contatori live animati (offerte/chat) e indicatore "pulse"
- Scroll automatico verso il basso con smooth scroll
- Offerte con highlight neon verde e animazione slide-in da destra
- Chat con stile bubble, messaggi host evidenziati con bordo primario
- Separatore visivo tra offerte e chat con icone

**4. Prodotti in griglia responsiva**
- Da lista verticale a griglia `grid-cols-1 sm:grid-cols-2` per i prodotti
- Card prodotto con stato visuale chiaro: bordo colorato + sfondo sfumato
- Indicatore di stato con dot colorato animato per "active"
- Prezzo corrente prominente con badge offerte

**5. Layout responsivo migliorato**
- Mobile: stack verticale con Active Item hero in cima, poi feed, poi prodotti
- Desktop: grid 3 colonne - prodotti (2 col) + feed (1 col), active item full-width sopra
- Padding consistente `p-4 sm:p-6 lg:p-8`

**6. Real-time migliorato**
- Polling ridotto a 3 secondi durante live
- Sottoscrizione realtime anche su `auction_sales` per aggiornare vendite senza refresh
- Aggiungere contatore spettatori con animazione pulse quando cambia
- Feed auto-scroll con `scrollIntoView({ behavior: 'smooth' })`

### File da modificare
- `src/pages/centro/CentroAste.tsx` - Redesign completo del layout, stats, active item, feed e prodotti

### Dettagli tecnici
- Uso di `framer-motion` per tutte le animazioni (layout, scale, opacity)
- Progress ring SVG per countdown circolare
- `useRef` + `useEffect` per auto-scroll del feed
- Sottoscrizione realtime aggiuntiva su `auction_sales`
- Nessuna modifica al database richiesta

