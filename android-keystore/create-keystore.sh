#!/bin/bash
# Script to create a fixed keystore for the project
# Run this once locally to generate the keystore

KEYSTORE_FILE="release-keystore.jks"
KEYSTORE_PASSWORD="lablinkriparo2024secure"
KEY_ALIAS="lablinkriparo"
KEY_PASSWORD="lablinkriparo2024secure"

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=LabLinkRiparo, OU=Mobile, O=LabLinkRiparo, L=Milan, ST=Lombardy, C=IT"

echo "Keystore created: $KEYSTORE_FILE"
echo "Base64 for embedding:"
base64 -w 0 "$KEYSTORE_FILE"
