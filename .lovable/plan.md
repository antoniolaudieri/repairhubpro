

## Piano: Campagna Marketing Ricondizionati con Tracking

### Obiettivo
Creare nell'admin una sezione per gestire offerte ricondizionati e inviarle via email ai clienti dei Centri, tracciando aperture e click sul link con coupon EVLZBANT.

### 1. Nuova tabella: `ricondizionati_campaigns`

Migrazione SQL per creare la tabella che traccia le campagne:

```sql
CREATE TABLE public.ricondizionati_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  offer_text TEXT NOT NULL,
  coupon_code TEXT NOT NULL DEFAULT 'EVLZBANT',
  discount_amount NUMERIC DEFAULT 10,
  destination_url TEXT NOT NULL DEFAULT 'https://ricondizionati.evolutionlevel.it',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, archived
  sent_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ricondizionati_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES ricondizionati_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  centro_id UUID REFERENCES centri_assistenza(id),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  tracking_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rcr_tracking ON ricondizionati_campaign_recipients(tracking_id);
CREATE INDEX idx_rcr_campaign ON ricondizionati_campaign_recipients(campaign_id);
```

RLS: solo platform_admin (usando `is_platform_admin(auth.uid())`).

### 2. Nuova tab Admin: "Promo Ricondizionati"

Aggiungere una nuova tab in `AdminMarketing.tsx` con icona smartphone/gift.

**Componente `RicondizionatiCampaignsTab.tsx`** con:

- **Lista campagne** con stats (inviate, aperte, click, tasso conversione)
- **Crea nuova campagna**: form con titolo, descrizione offerta, anteprima email
- **Seleziona destinatari**: carica tutti i clienti con email da tutti i Centri (o filtra per Centro), con checkbox di selezione multipla
- **Invia campagna**: per ogni destinatario:
  1. Crea record in `ricondizionati_campaign_recipients` con `tracking_id`
  2. Genera HTML email con tracking pixel (apertura) e link tracciato (click)
  3. Invia via `send-email-smtp` edge function
- **Dashboard analytics**: per ogni campagna mostra % apertura, % click, lista dettagliata destinatari con stato

### 3. Edge function: `ricondizionati-track`

Nuova edge function che gestisce:
- **Apertura** (`?a=open&t={tracking_id}`): restituisce tracking pixel 1x1 PNG, aggiorna `opened_at` e `open_count`
- **Click** (`?a=click&t={tracking_id}`): aggiorna `clicked_at` e `click_count`, poi redirect a `destination_url`. Prima del redirect, il link passa per una pagina intermedia che copia il coupon negli appunti

### 4. Template Email HTML

Email con:
- Header brandizzato con logo/nome piattaforma
- Immagine offerta (opzionale)
- Testo offerta personalizzato con `{{nome}}` del cliente
- Coupon code evidenziato in un box
- CTA "Scopri l'offerta" con link tracciato
- Footer con link disiscrizione GDPR
- Tracking pixel per apertura

### 5. Pagina intermedia `/promo-redirect`

Quando il cliente clicca il link nell'email:
1. Arriva su `/promo-redirect?t={tracking_id}`
2. La pagina copia automaticamente il coupon EVLZBANT negli appunti
3. Mostra un messaggio "Coupon copiato! Ti stiamo reindirizzando..."
4. Dopo 2 secondi, redirect al sito Evolution Level
5. Traccia il click nel database

### Riepilogo file da creare/modificare

| File | Azione |
|------|--------|
| Migrazione SQL | Creare tabelle `ricondizionati_campaigns` e `ricondizionati_campaign_recipients` |
| `src/components/admin/marketing/RicondizionatiCampaignsTab.tsx` | Nuovo componente tab |
| `src/pages/admin/AdminMarketing.tsx` | Aggiungere tab "Promo Ricondizionati" |
| `supabase/functions/ricondizionati-track/index.ts` | Edge function tracking aperture/click |
| `src/pages/PromoRedirect.tsx` | Pagina intermedia auto-copy + redirect |
| `src/App.tsx` | Aggiungere route `/promo-redirect` |

