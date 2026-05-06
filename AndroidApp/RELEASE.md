# Releasing Aether Radio APK

## One-time setup — generate a signing keystore

Run this once on your machine and keep the keystore file safe:

```bash
keytool -genkey -v \
  -keystore android/aether-radio.keystore \
  -alias aether-radio \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

## Add GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -i android/aether-radio.keystore` output |
| `KEYSTORE_PASSWORD` | The password you chose above |
| `KEY_ALIAS` | `aether-radio` |
| `KEY_PASSWORD` | The key password you chose above |

## Trigger a release

Push a tag in the format `android-v1.1.0`:

```bash
git tag android-v1.1.0
git push origin android-v1.1.0
```

The workflow will:
1. Build the web assets
2. Sync Capacitor
3. Compile and sign the APK
4. Create a GitHub Release with the APK attached for direct download

## Local build

```bash
# Build web + sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build APK from CLI (needs keystore.properties set up)
cp android/keystore.properties.example android/keystore.properties
# edit keystore.properties with your values
cd android && ./gradlew assembleRelease
# APK → android/app/build/outputs/apk/release/app-release.apk
```
