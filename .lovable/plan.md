

## Campaign Detail Dashboard - Piano di Implementazione

### Problema
Attualmente la tabella campagne mostra solo i numeri aggregati (inviati, aperti, click, copiati) ma non c'è modo di vedere **chi** ha fatto cosa. Manca anche il tracciamento delle disiscrizioni a livello di campagna.

### Soluzione

Creare una vista dettaglio campagna che si apre cliccando su una riga della tabella, mostrando il funnel completo per ogni singolo destinatario con aggiornamento in tempo reale.

### Modifiche

**1. Database: Aggiungere colonna `unsubscribed_at` ai recipients**
- Migrazione SQL: aggiungere `unsubscribed_at timestamptz` a `ricondizionati_campaign_recipients`
- Aggiungere `total_unsubscribed int` a `ricondizionati_campaigns`
- Abilitare realtime su `ricondizionati_campaign_recipients` per aggiornamenti live

**2. Edge function `marketing-unsubscribe`**: quando un utente si disiscrive, aggiornare anche `ricondizionati_campaign_recipients.unsubscribed_at` cercando per email.

**3. Nuovo componente `CampaignDetailDialog`** nel file `CentroRicondizionatiTab.tsx`:
- Dialog modale che si apre cliccando una campagna
- **Barra funnel visuale**: Inviati → Aperti → Click → Copiati → Disiscritti con percentuali
- **Tabella destinatari** con colonne:
  - Nome, Email
  - Stato (icone/badge): Inviata / Aperta / Cliccata / Coupon Copiato / Disiscritto
  - Timestamp di ogni azione
  - Contatori (open_count, click_count, copy_count)
- **Filtri rapidi**: Tutti / Aperti / Non aperti / Click / Copiati / Disiscritti
- Sottoscrizione Realtime su `ricondizionati_campaign_recipients` filtrata per `campaign_id`

**4. Aggiornare la tabella campagne** in `CentroRicondizionatiTab.tsx`:
- Rendere le righe cliccabili per aprire il dettaglio
- Aggiungere colonna "Disiscritti"
- Aggiungere barra di progresso visuale nel funnel (mini progress bar colorata)

### Flusso dati realtime
- Sottoscrizione Postgres Changes su `ricondizionati_campaign_recipients` con filtro `campaign_id`
- Ogni cambiamento aggiorna la lista destinatari istantaneamente senza polling

