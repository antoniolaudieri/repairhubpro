import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lablinkriparo.monitor',
  appName: 'LabLinkRiparo',
  webDir: 'dist',
  // Server config only for development hot-reload - remove for production APK
  // server: {
  //   url: 'https://7522884a-a116-466d-8d27-8f081d5be322.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  android: {
    // Prevent WebView from zooming and ensure proper scaling
    initialFocus: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  }
};

export default config;
