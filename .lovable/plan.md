

## Piano: Integrazione Ricondizionati Evolution Level in UsatoHub

### Cosa faremo

Aggiungeremo una sezione "Ricondizionati Certificati" nella pagina UsatoHub che mostra i prodotti di Evolution Level con il tuo coupon affiliato **EVLZBANT**, tracciando i click per monitorare le performance.

### Architettura

1. **Nuova tab/sezione nella pagina UsatoHub** - Separata dai dispositivi usati locali, con una sezione dedicata "Ricondizionati Certificati" che mostra le categorie di Evolution Level (iPhone, Samsung, iPad, MacBook, Console, ecc.)

2. **Card prodotto con link affiliato** - Ogni categoria porta al sito partner con il coupon ben visibile. Il cliente clicca, va sul sito Evolution Level, e applica il coupon EVLZBANT al carrello per lo sconto di €10

3. **Banner coupon prominente** - Un banner fisso che mostra il codice coupon EVLZBANT con pulsante "Copia" per facilitare l'applicazione

4. **Tabella di tracciamento click** (database) - Una nuova tabella `affiliate_clicks` per registrare ogni click verso Evolution Level, così puoi monitorare quante persone stai inviando

5. **Dashboard admin semplice** - Sezione nell'admin per vedere i click, con possibilità di annotare manualmente le vendite confermate e calcolare le commissioni (8-11%)

### Dettagli tecnici

**Nuova tabella `affiliate_clicks`:**
- `id`, `created_at`
- `affiliate_program` (es. "evolution_level") 
- `coupon_code` ("EVLZBANT")
- `category_clicked` (es. "iphone", "samsung")
- `destination_url`
- `user_agent`, `ip_hash` (per deduplicazione)

**Nuova tabella `affiliate_sales`** (tracciamento manuale):
- `id`, `created_at`
- `affiliate_program`, `coupon_code`
- `sale_amount`, `commission_rate`, `commission_earned`
- `notes`, `sale_date`

**Componenti UI:**
- `RicondizionatiSection` - Griglia di categorie con immagini e link al sito partner
- Banner coupon con codice copiabile e istruzioni chiare
- Ogni click viene tracciato prima del redirect

**Nella pagina UsatoHub:**
- Aggiunta di un tab switcher "I Nostri Usati" / "Ricondizionati Certificati" 
- La sezione ricondizionati mostra le categorie Evolution Level con card attrattive
- Ogni card ha: immagine categoria, nome, descrizione, pulsante "Vai allo Shop" che traccia il click e apre il sito partner in nuova tab

### Flusso utente

1. Cliente visita UsatoHub → vede tab "Ricondizionati Certificati"
2. Vede le categorie (iPhone, Samsung, iPad, MacBook, ecc.) con il banner coupon EVLZBANT
3. Clicca su una categoria → click tracciato nel DB → si apre il sito Evolution Level in nuova tab
4. Cliente applica coupon EVLZBANT al carrello → sconto €10 per lui, commissione 8-11% per te

