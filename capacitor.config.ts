import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lablinkriparo.monitor',
  appName: 'LabLinkRiparo',
  webDir: 'dist',
  server: {
    url: 'https://7522884a-a116-466d-8d27-8f081d5be322.lovableproject.com/device-monitor?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
