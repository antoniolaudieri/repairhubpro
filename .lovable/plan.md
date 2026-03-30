

## Piano: Fix Geolocalizzazione su Android Nativo

### Problema
Su Android nativo (APK Capacitor), `navigator.geolocation.getCurrentPosition()` restituisce "user denied" anche con permessi attivi. Questo perché su Capacitor nativo bisogna usare il plugin `@capacitor/geolocation` invece delle Web API del browser — il WebView Android non ha accesso diretto ai permessi di geolocalizzazione del sistema.

### Soluzione
In `src/hooks/useNativeDeviceInfo.tsx` (righe 400-422), aggiungere un check `Capacitor.isNativePlatform()`:
- **Se nativo**: usare `Geolocation.getCurrentPosition()` dal plugin `@capacitor/geolocation` (già installato e importato in `useDevicePermissions.tsx`)
- **Se web**: mantenere il fallback `navigator.geolocation.getCurrentPosition()` attuale

### Modifica
**File**: `src/hooks/useNativeDeviceInfo.tsx`

Nella sezione geolocation (~riga 400):
1. Importare `Geolocation` da `@capacitor/geolocation` e `Capacitor` (già importato)
2. Su piattaforma nativa: prima richiedere permessi con `Geolocation.requestPermissions()`, poi ottenere posizione con `Geolocation.getCurrentPosition()`
3. Su web: mantenere codice attuale con `navigator.geolocation`

Questo risolve il problema perché il plugin Capacitor comunica direttamente con le API Android native per i permessi, bypassando le limitazioni del WebView.

