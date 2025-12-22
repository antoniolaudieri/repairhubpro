import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7522884aa116466d8d278f081d5be322',
  appName: 'repairhubpro',
  webDir: 'dist',
  server: {
    url: 'https://7522884a-a116-466d-8d27-8f081d5be322.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
