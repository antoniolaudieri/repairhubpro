# Istruzioni per Installare il Plugin DeviceDiagnostics su Android

## Prerequisiti
1. Aver eseguito `npx cap add android`
2. Android Studio installato

## Passaggi

### 1. Copia il file del plugin
Copia il file `DeviceDiagnosticsPlugin.java` nella cartella:
```
android/app/src/main/java/app/lovable/repairhubpro/
```

Se la cartella `repairhubpro` non esiste, creala.

### 2. Registra il plugin in MainActivity
Apri il file `android/app/src/main/java/app/lovable/repairhubpro/MainActivity.java` e modifica così:

```java
package app.lovable.repairhubpro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceDiagnosticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### 3. Aggiungi i permessi nel AndroidManifest.xml
Apri `android/app/src/main/AndroidManifest.xml` e aggiungi questi permessi dentro il tag `<manifest>`:

```xml
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" 
    tools:ignore="ProtectedPermissions" />
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
```

E aggiungi il namespace tools nell'elemento manifest:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

### 4. Sincronizza e ricompila
```bash
npx cap sync android
npx cap run android
```

## Funzionalità

Il plugin fornisce:
- **getStorageInfo()**: Info storage (totale, usato, disponibile)
- **getRamInfo()**: Info RAM
- **getSensorsInfo()**: Lista sensori disponibili
- **getBatteryAdvancedInfo()**: Info batteria dettagliate (temperatura, voltaggio, salute)
- **getInstalledAppsStorage()**: Lista app installate con dimensioni reali
- **testSensor()**: Test singolo sensore
- **requestUsageStatsPermission()**: Richiede permesso per stats dettagliate

## Note
- Per ottenere dimensioni app accurate, l'utente deve concedere il permesso "Usage Access" nelle impostazioni
- Le app sono ordinate per dimensione decrescente
- Vengono restituite max 50 app per performance
