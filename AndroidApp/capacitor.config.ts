import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aetherradio.app',
  appName: 'Aether Radio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*'],
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    // Disable WebContents debugging in production — re-enable manually for development
    webContentsDebuggingEnabled: false,
    // Keep WebView alive when app goes to background
    backgroundColor: '#121214',
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#121214',
    },
  },
}

export default config
