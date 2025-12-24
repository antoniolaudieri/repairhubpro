#!/bin/bash

# Script per configurare il plugin DeviceDiagnostics su Android
# Esegui dopo: npx cap add android

PLUGIN_SOURCE="android-plugin/DeviceDiagnosticsPlugin.java"
PLUGIN_DEST="android/app/src/main/java/com/lablinkriparo/monitor/DeviceDiagnosticsPlugin.java"
MAIN_ACTIVITY="android/app/src/main/java/com/lablinkriparo/monitor/MainActivity.java"
MANIFEST="android/app/src/main/AndroidManifest.xml"
FILE_PATHS_SOURCE="android-plugin/res/xml/file_paths.xml"
FILE_PATHS_DEST="android/app/src/main/res/xml/file_paths.xml"

echo "🔧 Configurazione plugin DeviceDiagnostics..."

# 1. Copia il file del plugin
if [ -f "$PLUGIN_SOURCE" ]; then
    mkdir -p "$(dirname $PLUGIN_DEST)"
    cp "$PLUGIN_SOURCE" "$PLUGIN_DEST"
    echo "✅ Plugin copiato in $PLUGIN_DEST"
else
    echo "❌ Errore: File plugin non trovato in $PLUGIN_SOURCE"
    exit 1
fi

# 2. Copia file_paths.xml per FileProvider
if [ -f "$FILE_PATHS_SOURCE" ]; then
    mkdir -p "$(dirname $FILE_PATHS_DEST)"
    cp "$FILE_PATHS_SOURCE" "$FILE_PATHS_DEST"
    echo "✅ file_paths.xml copiato in $FILE_PATHS_DEST"
else
    echo "⚠️ Avviso: file_paths.xml non trovato, creazione manuale..."
    mkdir -p "$(dirname $FILE_PATHS_DEST)"
    cat > "$FILE_PATHS_DEST" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="downloads" path="Download/" />
    <external-path name="external" path="." />
    <cache-path name="cache" path="." />
</paths>
EOF
    echo "✅ file_paths.xml creato"
fi

# 3. Patch MainActivity per registrare il plugin
if [ -f "$MAIN_ACTIVITY" ]; then
    if ! grep -q "DeviceDiagnosticsPlugin" "$MAIN_ACTIVITY"; then
        cp "$MAIN_ACTIVITY" "$MAIN_ACTIVITY.bak"
        
        # Aggiungi import
        sed -i 's/import com.getcapacitor.BridgeActivity;/import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;/' "$MAIN_ACTIVITY"
        
        # Aggiungi registrazione plugin nel metodo onCreate
        sed -i 's/public class MainActivity extends BridgeActivity {/public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(DeviceDiagnosticsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }/' "$MAIN_ACTIVITY"
        
        echo "✅ MainActivity aggiornato con registrazione plugin"
    else
        echo "ℹ️ Plugin già registrato in MainActivity"
    fi
else
    echo "⚠️ MainActivity non trovato. Esegui prima: npx cap add android"
fi

# 4. Aggiungi namespace tools al manifest
if [ -f "$MANIFEST" ]; then
    if ! grep -q 'xmlns:tools=' "$MANIFEST"; then
        sed -i 's/<manifest xmlns:android="http:\/\/schemas.android.com\/apk\/res\/android"/<manifest xmlns:android="http:\/\/schemas.android.com\/apk\/res\/android"\n    xmlns:tools="http:\/\/schemas.android.com\/tools"/' "$MANIFEST"
        echo "✅ Namespace tools aggiunto al manifest"
    fi
fi

# 5. Aggiungi permessi al manifest
if [ -f "$MANIFEST" ]; then
    # PACKAGE_USAGE_STATS
    if ! grep -q "PACKAGE_USAGE_STATS" "$MANIFEST"; then
        sed -i 's/<application/<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" \/>\n    <application/' "$MANIFEST"
        echo "✅ Permesso PACKAGE_USAGE_STATS aggiunto"
    fi
    
    # QUERY_ALL_PACKAGES
    if ! grep -q "QUERY_ALL_PACKAGES" "$MANIFEST"; then
        sed -i 's/<application/<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" tools:ignore="QueryAllPackagesPermission" \/>\n    <application/' "$MANIFEST"
        echo "✅ Permesso QUERY_ALL_PACKAGES aggiunto"
    fi
    
    # REQUEST_INSTALL_PACKAGES (per installare APK)
    if ! grep -q "REQUEST_INSTALL_PACKAGES" "$MANIFEST"; then
        sed -i 's/<application/<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" \/>\n    <application/' "$MANIFEST"
        echo "✅ Permesso REQUEST_INSTALL_PACKAGES aggiunto"
    fi
    
    # WRITE_EXTERNAL_STORAGE (per download)
    if ! grep -q "WRITE_EXTERNAL_STORAGE" "$MANIFEST"; then
        sed -i 's/<application/<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" \/>\n    <application/' "$MANIFEST"
        echo "✅ Permesso WRITE_EXTERNAL_STORAGE aggiunto"
    fi
    
    # READ_EXTERNAL_STORAGE
    if ! grep -q "READ_EXTERNAL_STORAGE" "$MANIFEST"; then
        sed -i 's/<application/<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" \/>\n    <application/' "$MANIFEST"
        echo "✅ Permesso READ_EXTERNAL_STORAGE aggiunto"
    fi
else
    echo "⚠️ AndroidManifest.xml non trovato"
fi

# 6. Aggiungi FileProvider al manifest (dentro <application>)
if [ -f "$MANIFEST" ]; then
    if ! grep -q "fileprovider" "$MANIFEST"; then
        # Inserisci il FileProvider prima di </application>
        sed -i 's/<\/application>/\n        <provider\n            android:name="androidx.core.content.FileProvider"\n            android:authorities="${applicationId}.fileprovider"\n            android:exported="false"\n            android:grantUriPermissions="true">\n            <meta-data\n                android:name="android.support.FILE_PROVIDER_PATHS"\n                android:resource="@xml\/file_paths" \/>\n        <\/provider>\n    <\/application>/' "$MANIFEST"
        echo "✅ FileProvider aggiunto al manifest"
    else
        echo "ℹ️ FileProvider già presente nel manifest"
    fi
fi

echo ""
echo "🎉 Configurazione completata!"
echo ""
echo "Prossimi passi:"
echo "1. npx cap sync android"
echo "2. npx cap run android"
echo ""
echo "Note:"
echo "- Per le statistiche app, l'utente deve abilitare 'Accesso utilizzo' nelle impostazioni di sistema"
echo "- Per gli aggiornamenti APK, l'APK deve essere firmato con la stessa chiave"
