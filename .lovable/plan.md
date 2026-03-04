

## Piano: QR Code partecipazione + Condivisione virale

### 1. QR Code in alto a destra (AstaLive.tsx)
- Aggiungere un QR code nell'header overlay (zona top-right) che contiene il link diretto all'asta: `${window.location.origin}/asta/${auctionId}`
- Usare la libreria `qrcode.react` (già installata) con `QRCodeSVG`
- QR piccolo (~60px) con sfondo semi-trasparente e bordo bianco, visibile su qualsiasi sfondo video
- Al tap sul QR si apre un dialog/sheet di condivisione

### 2. Sistema di condivisione virale
Creare un **pannello di condivisione** (dialog o bottom sheet) che si apre toccando il QR o un bottone "Condividi":
- **QR grande** al centro per scansione facile (utile quando l'asta è su un monitor/TV)
- **Bottone "Condividi"** che usa `navigator.share()` (Web Share API) con testo accattivante, titolo asta e link
- **Bottone "Copia Link"** come fallback
- **Bottoni social diretti**: WhatsApp, Telegram, Twitter/X con link pre-compilati e testo virale
- Testo condivisione: "🔴 LIVE ORA! {centro} sta vendendo all'asta! Partecipa → {link}"

### 3. Grafica
- QR code con angoli arrotondati, logo/icona al centro (martelletto o logo centro)
- Dialog condivisione con gradiente, animazioni framer-motion
- Badge "LIVE" lampeggiante nel testo di condivisione
- Design coerente con lo stile dark/glassmorphism dell'asta

### File da modificare
- **`src/pages/AstaLive.tsx`**: aggiungere QR overlay + dialog condivisione con social sharing

### Struttura UI
```text
┌──────────────────────────────┐
│ [Logo] Centro Name   [LIVE] [👁 12] [QR]│  ← QR piccolo top-right
│                                          │
│         VIDEO STREAM                     │
│                                          │
│  Chat feed...                            │
│                                          │
│  [Say something...]                      │
│  [Product card]                          │
│  [Custom] [Offri €25]                    │
└──────────────────────────────────────────┘

Dialog Condivisione (tap QR):
┌─────────────────────────┐
│   🔴 LIVE NOW!          │
│   [QR CODE GRANDE]      │
│   Scansiona per entrare │
│                         │
│  [📋 Copia Link]        │
│  [WhatsApp] [Telegram]  │
│  [Twitter]  [Condividi] │
└─────────────────────────┘
```

