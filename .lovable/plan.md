
# MCP Server per accesso al database

Creo un server MCP (Model Context Protocol) ospitato come Edge Function di Lovable Cloud. Il tuo agente (Claude Desktop, Cursor, ecc.) si collegherà a un URL HTTPS protetto da API Key segreta e potrà leggere, modificare ed eliminare dati su **tutte le tabelle**.

## Cosa creerò

### 1. Edge Function `mcp-server`
Un endpoint MCP via HTTP Streamable basato su `mcp-lite` + `Hono`, deployato come funzione serverless. Userà la **Service Role Key** del progetto (lato server) per bypassare RLS e avere accesso totale al database.

### 2. Strumenti MCP esposti all'agente
- `list_tables` — elenca tutte le tabelle disponibili
- `describe_table` — mostra colonne e tipi di una tabella
- `query_table` — SELECT con filtri (eq, neq, gt, lt, like, in), order, limit
- `insert_row` — INSERT su una tabella
- `update_rows` — UPDATE con filtri
- `delete_rows` — DELETE con filtri
- `count_rows` — COUNT con filtri

Tutti gli strumenti validano input con Zod e operano via Supabase JS client con Service Role.

### 3. Autenticazione tramite API Key
- Aggiungo un secret `MCP_API_KEY` (la generi tu, una stringa lunga casuale).
- Ogni richiesta all'endpoint MCP deve includere l'header `Authorization: Bearer <MCP_API_KEY>`.
- Senza header valido → risposta `401`.
- La funzione viene configurata con `verify_jwt = false` perché usa l'API Key custom invece del JWT Supabase.

### 4. Configurazione lato agente
Ti fornirò:
- L'URL pubblico dell'endpoint: `https://mivvpthovnkynigfwmjm.supabase.co/functions/v1/mcp-server`
- Esempio di configurazione `mcp.json` per Claude Desktop / Cursor / altri client MCP con l'header Authorization

## Considerazioni di sicurezza importanti

- L'API Key dà **accesso totale al database** (bypassa RLS, può cancellare qualunque cosa). Tienila segreta come una password admin.
- Se compromessa, puoi rigenerarla aggiornando il secret `MCP_API_KEY`.
- Consiglio: ruotare la chiave periodicamente.
- L'endpoint è pubblico su internet ma protetto dalla chiave. Nessuna sessione utente coinvolta.

## Passi operativi

1. Ti chiederò di inserire il valore di `MCP_API_KEY` (genera una stringa casuale lunga, es. `openssl rand -hex 32`).
2. Creo l'edge function `mcp-server` con tutti i tool sopra.
3. Aggiungo la configurazione `[functions.mcp-server] verify_jwt = false` in `supabase/config.toml`.
4. Ti fornisco URL + snippet di configurazione MCP da incollare nel tuo client.

## Note tecniche

- Stack: `mcp-lite@^0.10.0`, `hono`, `@supabase/supabase-js@2`
- Trasporto: MCP Streamable HTTP
- Niente modifiche allo schema del database
- Niente modifiche al frontend

Confermami se procedo (oppure dimmi se preferisci limitare le operazioni — es. solo SELECT/INSERT senza DELETE).
