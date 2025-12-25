import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from './usePushNotifications';
import { useNativePushNotifications } from './useNativePushNotifications';

interface UnifiedPushState {
  isSupported: boolean;
  isGranted: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  platform: 'web' | 'android' | 'ios';
}

/**
 * Unified push notifications hook that works on both web (PWA) and native (Android/iOS)
 * Automatically selects the appropriate implementation based on platform
 */
export function useUnifiedPushNotifications() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';
  
  // Use appropriate hook based on platform
  const webPush = usePushNotifications();
  const nativePush = useNativePushNotifications();

  const [state, setState] = useState<UnifiedPushState>({
    isSupported: false,
    isGranted: false,
    isSubscribed: false,
    isLoading: true,
    platform,
  });

  // Update state based on platform
  useEffect(() => {
    if (isNative) {
      setState({
        isSupported: nativePush.isSupported,
        isGranted: nativePush.isGranted,
        isSubscribed: nativePush.isRegistered,
        isLoading: nativePush.isLoading,
        platform,
      });
    } else {
      setState({
        isSupported: webPush.isSupported,
        isGranted: webPush.isGranted,
        isSubscribed: webPush.isSubscribed,
        isLoading: webPush.isLoading,
        platform: 'web',
      });
    }
  }, [
    isNative,
    platform,
    webPush.isSupported,
    webPush.isGranted,
    webPush.isSubscribed,
    webPush.isLoading,
    nativePush.isSupported,
    nativePush.isGranted,
    nativePush.isRegistered,
    nativePush.isLoading,
  ]);

  // Subscribe/Register for push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (isNative) {
      return await nativePush.register();
    } else {
      return await webPush.subscribe();
    }
  }, [isNative, nativePush, webPush]);

  // Unsubscribe/Unregister from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (isNative) {
      return await nativePush.unregister();
    } else {
      return await webPush.unsubscribe();
    }
  }, [isNative, nativePush, webPush]);

  // Send local notification (for testing or local alerts)
  const sendLocalNotification = useCallback((
    title: string, 
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (isNative) {
      nativePush.sendLocalNotification(title, body, data);
    } else {
      webPush.sendLocalNotification(title, { body, data });
    }
  }, [isNative, nativePush, webPush]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification,
    // Raw access to platform-specific hooks if needed
    webPush: isNative ? null : webPush,
    nativePush: isNative ? nativePush : null,
  };
}
