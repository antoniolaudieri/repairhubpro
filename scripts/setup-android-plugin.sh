#!/bin/bash
# Script to setup Android plugin after cap sync

PLUGIN_SOURCE="android-plugin/DeviceDiagnosticsPlugin.java"
ANDROID_DIR="android/app/src/main/java/com/lablinkriparo/monitor"

# Create directory if it doesn't exist
mkdir -p "$ANDROID_DIR"

# Copy plugin file
if [ -f "$PLUGIN_SOURCE" ]; then
  cp "$PLUGIN_SOURCE" "$ANDROID_DIR/"
  echo "✅ DeviceDiagnosticsPlugin copied to Android project"
else
  echo "❌ Plugin source not found: $PLUGIN_SOURCE"
  exit 1
fi

# Check if MainActivity exists and needs patching
MAIN_ACTIVITY="android/app/src/main/java/com/lablinkriparo/monitor/MainActivity.java"

if [ -f "$MAIN_ACTIVITY" ]; then
  # Check if plugin is already registered
  if grep -q "DeviceDiagnosticsPlugin" "$MAIN_ACTIVITY"; then
    echo "✅ Plugin already registered in MainActivity"
  else
    # Backup original
    cp "$MAIN_ACTIVITY" "$MAIN_ACTIVITY.bak"
    
    # Add import and registration
    sed -i 's/import com.getcapacitor.BridgeActivity;/import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;/' "$MAIN_ACTIVITY"
    
    # Add onCreate method with plugin registration
    sed -i 's/public class MainActivity extends BridgeActivity {/public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(DeviceDiagnosticsPlugin.class);\n        super.onCreate(savedInstanceState);\n    }/' "$MAIN_ACTIVITY"
    
    echo "✅ Plugin registered in MainActivity"
  fi
else
  echo "⚠️ MainActivity not found. Run 'npx cap add android' first."
fi

# Add required permissions to AndroidManifest.xml
MANIFEST="android/app/src/main/AndroidManifest.xml"

if [ -f "$MANIFEST" ]; then
  if grep -q "QUERY_ALL_PACKAGES" "$MANIFEST"; then
    echo "✅ Permissions already added to AndroidManifest"
  else
    # Add permissions before closing manifest tag
    sed -i 's/<\/manifest>/    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" \/>\n<\/manifest>/' "$MANIFEST"
    echo "✅ Permissions added to AndroidManifest"
  fi
fi

echo ""
echo "🎉 Android plugin setup complete!"
echo "Run 'npx cap sync android' and then 'npx cap run android' to test"
