import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

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
  const [isNative] = useState(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  });
  
  const [platform] = useState<'web' | 'android' | 'ios'>(() => {
    try {
      return Capacitor.getPlatform() as 'web' | 'android' | 'ios';
    } catch {
      return 'web';
    }
  });

  const [state, setState] = useState<UnifiedPushState>({
    isSupported: false,
    isGranted: false,
    isSubscribed: false,
    isLoading: true,
    platform,
  });

  const [nativeHook, setNativeHook] = useState<{
    register: () => Promise<boolean>;
    unregister: () => Promise<boolean>;
    sendLocalNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<void>;
  } | null>(null);

  const [webHook, setWebHook] = useState<{
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    sendLocalNotification: (title: string, options?: NotificationOptions) => void;
  } | null>(null);

  // Initialize the appropriate push hook based on platform
  useEffect(() => {
    const init = async () => {
      if (isNative) {
        // Dynamically import native push hook to avoid issues on web
        try {
          const { useNativePushNotifications } = await import('./useNativePushNotifications');
          // We can't use hooks dynamically, so we'll implement inline
          const { PushNotifications } = await import('@capacitor/push-notifications');
          
          // Check current permission status
          const permResult = await PushNotifications.checkPermissions();
          const isGranted = permResult.receive === 'granted';
          
          setState({
            isSupported: true,
            isGranted,
            isSubscribed: isGranted,
            isLoading: false,
            platform,
          });

          // Setup registration function
          setNativeHook({
            register: async () => {
              try {
                const currentPerm = await PushNotifications.checkPermissions();
                
                if (currentPerm.receive === 'prompt') {
                  const requestResult = await PushNotifications.requestPermissions();
                  if (requestResult.receive !== 'granted') {
                    setState(prev => ({ ...prev, isGranted: false }));
                    return false;
                  }
                } else if (currentPerm.receive === 'denied') {
                  return false;
                }

                await PushNotifications.register();
                setState(prev => ({ ...prev, isGranted: true, isSubscribed: true }));
                return true;
              } catch (error) {
                console.error('[UnifiedPush] Registration error:', error);
                return false;
              }
            },
            unregister: async () => {
              try {
                await PushNotifications.removeAllListeners();
                setState(prev => ({ ...prev, isSubscribed: false }));
                return true;
              } catch (error) {
                console.error('[UnifiedPush] Unregister error:', error);
                return false;
              }
            },
            sendLocalNotification: async (title: string, body: string, data?: Record<string, unknown>) => {
              try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                await LocalNotifications.schedule({
                  notifications: [{
                    id: Date.now(),
                    title,
                    body,
                    extra: data,
                  }]
                });
              } catch (error) {
                console.log('[UnifiedPush] Local notification error:', error);
              }
            }
          });

        } catch (error) {
          console.log('[UnifiedPush] Native push not available:', error);
          setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        }
      } else {
        // Web push - check support safely
        try {
          const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
          const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
          const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;
          
          const isSupported = hasNotification && hasServiceWorker && hasPushManager;

          if (!isSupported) {
            setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
            return;
          }

          let permission: NotificationPermission = 'default';
          try {
            permission = Notification.permission;
          } catch (e) {
            console.log('[UnifiedPush] Could not read Notification.permission');
          }

          setState({
            isSupported: true,
            isGranted: permission === 'granted',
            isSubscribed: permission === 'granted',
            isLoading: false,
            platform: 'web',
          });

          setWebHook({
            subscribe: async () => {
              try {
                const result = await Notification.requestPermission();
                const granted = result === 'granted';
                setState(prev => ({ ...prev, isGranted: granted, isSubscribed: granted }));
                return granted;
              } catch (error) {
                console.error('[UnifiedPush] Subscribe error:', error);
                return false;
              }
            },
            unsubscribe: async () => {
              setState(prev => ({ ...prev, isSubscribed: false }));
              return true;
            },
            sendLocalNotification: (title: string, options?: NotificationOptions) => {
              try {
                new Notification(title, options);
              } catch (error) {
                console.log('[UnifiedPush] Local notification error:', error);
              }
            }
          });

        } catch (error) {
          console.log('[UnifiedPush] Web push init error:', error);
          setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        }
      }
    };

    init();
  }, [isNative, platform]);

  // Subscribe/Register for push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (isNative && nativeHook) {
      return await nativeHook.register();
    } else if (!isNative && webHook) {
      return await webHook.subscribe();
    }
    return false;
  }, [isNative, nativeHook, webHook]);

  // Unsubscribe/Unregister from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (isNative && nativeHook) {
      return await nativeHook.unregister();
    } else if (!isNative && webHook) {
      return await webHook.unsubscribe();
    }
    return false;
  }, [isNative, nativeHook, webHook]);

  // Send local notification
  const sendLocalNotification = useCallback((
    title: string, 
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (isNative && nativeHook) {
      nativeHook.sendLocalNotification(title, body, data);
    } else if (!isNative && webHook) {
      webHook.sendLocalNotification(title, { body, data: data as any });
    }
  }, [isNative, nativeHook, webHook]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
