import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aetherradio.app',
  appName: 'Aether Radio',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow radio stream URLs from any origin
    allowNavigation: ['*'],
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#121214',
    },
  },
}

export default config
