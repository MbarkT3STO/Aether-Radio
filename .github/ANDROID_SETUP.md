# Android CI Setup

## Debug builds
Push to `main`/`master` or trigger manually from the **Actions** tab.  
The APK is uploaded as a workflow artifact — download it from the run page.

## Release builds (signed APK)

### 1. Generate a keystore (one time, on your machine)
```bash
keytool -genkey -v \
  -keystore aether-radio.keystore \
  -alias aether-radio \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 2. Base64-encode the keystore
```bash
base64 -i aether-radio.keystore | pbcopy   # macOS — copies to clipboard
```

### 3. Add GitHub Secrets
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret name        | Value                                      |
|--------------------|--------------------------------------------|
| `KEYSTORE_BASE64`  | The base64 string from step 2              |
| `KEYSTORE_PASSWORD`| The password you chose for the keystore    |
| `KEY_ALIAS`        | `aether-radio` (or whatever alias you used)|
| `KEY_PASSWORD`     | The key password (can be same as above)    |

### 4. Trigger a release
Push a tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```
The workflow builds a signed APK and creates a GitHub Release automatically.
