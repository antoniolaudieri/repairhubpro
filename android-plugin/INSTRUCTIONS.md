# Istruzioni per Installare il Plugin DeviceDiagnostics su Android

## Prerequisiti
1. Aver eseguito `npx cap add android`
2. Android Studio installato

## Passaggi

### 1. Copia il file del plugin
Copia il file `DeviceDiagnosticsPlugin.java` nella cartella:
```
android/app/src/main/java/com/lablinkriparo/monitor/
```

Se la cartella `monitor` non esiste, creala.

### 2. Registra il plugin in MainActivity
Apri il file `android/app/src/main/java/com/lablinkriparo/monitor/MainActivity.java` e modifica così:

```java
package com.lablinkriparo.monitor;

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
Apri `android/app/src/main/AndroidManifest.xml` e aggiungi questi permessi dentro il tag `<manifest>`, **PRIMA** del tag `<application>`:

```xml
<!-- Permesso per statistiche uso app -->
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" 
    tools:ignore="ProtectedPermissions" />

<!-- Permesso per elenco app installate -->
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" 
    tools:ignore="QueryAllPackagesPermission" />

<!-- Permesso per installare APK (aggiornamenti) -->
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

<!-- Permesso per scaricare file -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
    android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
    android:maxSdkVersion="32" />
```

E aggiungi il namespace tools nell'elemento manifest:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
```

### 4. Configura il FileProvider per installazione APK
Dentro il tag `<application>` in `AndroidManifest.xml`, aggiungi:

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

### 5. Crea il file file_paths.xml
Crea la cartella `android/app/src/main/res/xml/` (se non esiste) e crea il file `file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="downloads" path="Download/" />
    <external-path name="external" path="." />
    <cache-path name="cache" path="." />
</paths>
```

### 6. Sincronizza e ricompila
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
- **downloadApk()**: Scarica APK aggiornamento
- **installApk()**: Installa APK scaricato

## Note Importanti

### Permesso "Accesso all'utilizzo" (PACKAGE_USAGE_STATS)
- Questo è un **permesso speciale** che NON appare nella lista permessi dell'app
- L'utente deve andare in **Impostazioni → App → Accesso speciale → Accesso utilizzo dati** e attivarlo manualmente
- L'app apre automaticamente questa schermata quando richiesto

### Permesso "Installa app sconosciute" (REQUEST_INSTALL_PACKAGES)
- Per installare aggiornamenti APK, l'app deve avere questo permesso
- Su Android 8+, l'utente verrà automaticamente reindirizzato alle impostazioni per abilitarlo la prima volta

### Aggiornamento App (sovrascrittura)
Per permettere l'aggiornamento sopra la versione esistente:
1. L'APK deve essere **firmato con la stessa chiave** della versione installata
2. Il **versionCode** nell'APK nuovo deve essere **maggiore** di quello installato
3. Il **package name** deve essere identico

Se usi GitHub Actions per il build, assicurati di:
- Usare sempre lo stesso keystore per firmare
- Incrementare `versionCode` in `android/app/build.gradle` ad ogni release
