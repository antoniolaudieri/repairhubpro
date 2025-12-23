import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lablinkriparo.monitor',
  appName: 'LabLinkRiparo',
  webDir: 'dist',
  server: {
    url: 'https://lablinkriparo.com/device-monitor?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
