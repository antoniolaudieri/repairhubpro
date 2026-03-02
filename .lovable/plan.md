

## Piano: Embed del sito Evolution Level nella sezione Ricondizionati

### Cosa faremo

Sostituiremo le "Info Pills" (Garanzia 12 Mesi, Sconto €10, Qualità Certificata) con un iframe che mostra direttamente il sito `ricondizionati.evolutionlevel.it` sotto il banner del coupon. In questo modo i clienti possono navigare il catalogo senza uscire dal tuo sito.

### Modifiche

**File: `src/components/usato/RicondizionatiSection.tsx`**
- Rimuovere la sezione "Info Pills" (le 3 badge Garanzia/Sconto/Qualità)
- Aggiungere un iframe a larghezza piena che carica `https://ricondizionati.evolutionlevel.it` subito dopo il banner coupon
- L'iframe avrà un'altezza generosa (~70-80vh) con bordi arrotondati e stile coerente
- Mantenere le category cards e la sezione "Come funziona" sotto l'iframe come accesso rapido alternativo

### Note tecniche

- L'iframe funzionerà solo se il sito partner non blocca l'embedding (header `X-Frame-Options`). Se lo blocca, mostreremo un fallback con un pulsante "Apri il catalogo" che apre il sito in una nuova tab
- Il tracciamento click continuerà a funzionare tramite le category cards sotto l'iframe

