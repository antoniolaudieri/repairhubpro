

## Piano: Auto-copia coupon + apertura sito

### Cosa faremo

Quando il cliente clicca "Vai allo Shop", il codice **EVLZBANT** viene copiato automaticamente negli appunti e appare un messaggio che ricorda di incollarlo al carrello. Poi si apre il sito Evolution Level in una nuova tab.

### Modifiche

**File: `src/components/usato/RicondizionatiSection.tsx`**

- Rimuovere l'iframe e la sezione categorie
- Aggiungere un grande pulsante CTA "Apri il Catalogo Ricondizionati" 
- Al click: copiare automaticamente il coupon EVLZBANT negli appunti → mostrare un toast "Coupon EVLZBANT copiato! Ricordati di applicarlo al carrello per ottenere €10 di sconto" → aprire il sito in nuova tab → tracciare il click nel database
- Mantenere il banner coupon in alto e le garanzie (24 mesi, 56 controlli Deka, spedizione gratuita, sostituzione diretta)
- Mantenere la sezione "Come funziona" aggiornata con il nuovo flusso (1. Clicca sul pulsante, 2. Il coupon si copia automaticamente, 3. Incollalo al carrello per lo sconto)

