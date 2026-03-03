

## Aste Live stile Whatnot — Registrazione inline + UI redesign

### Cosa cambia

**1. Registrazione/Login inline nella pagina asta (`AstaLive.tsx`)**
Attualmente chi non è loggato vede solo un link "Accedi" che porta via dalla pagina. Stile Whatnot, l'utente deve potersi registrare/loggare **senza lasciare l'asta**:

- **Modal/Dialog di registrazione** che appare quando l'utente clicca "Partecipa" o tenta di fare un'offerta
- Form compatto: nome, email, password (registrazione) oppure email+password (login)
- Tabs Login/Registrati dentro il dialog
- Dopo il login, il dialog si chiude e l'utente può fare offerte immediatamente
- Il dialog usa `supabase.auth.signUp` e `supabase.auth.signInWithPassword` direttamente

**2. Redesign UI stile Whatnot della pagina pubblica**
Rifare il layout di `AstaLive.tsx` per essere più immersivo e mobile-first:

- **Layout verticale mobile-first**: video/immagine prodotto in alto (aspect-ratio 4:3), poi prezzo + timer sovrapposti come overlay, bid feed a scorrimento sotto
- **Barra offerta fissa in basso** (sticky bottom bar) con i pulsanti di rilancio sempre visibili — stile Whatnot
- **Avatar/iniziali** per ogni offerta nel feed invece di solo testo
- **Animazioni più aggressive**: flash verde su nuova offerta vincente, shake sul prezzo quando cambia, confetti/emoji quando si vince
- **Header compatto** con logo centro, badge LIVE pulsante, contatore spettatori
- **Sezione "Prossimi lotti"** come carousel orizzontale scrollabile con miniature
- **Stato non-loggato**: mostra un banner prominente "Registrati per partecipare" con CTA grande sopra la barra offerta

**3. Nessuna modifica database**
L'auth e le tabelle aste esistono già. Il sistema di registrazione usa l'auth già in `useAuth`. Non servono nuove tabelle.

### File coinvolti
- `src/pages/AstaLive.tsx` — Redesign completo: layout Whatnot-style + dialog auth inline + sticky bid bar + animazioni
- Nessun altro file da modificare (auth hook e routes già configurati)

