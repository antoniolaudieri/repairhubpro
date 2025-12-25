import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NativePushState {
  isSupported: boolean;
  permission: 'prompt' | 'granted' | 'denied';
  isRegistered: boolean;
  isLoading: boolean;
  token: string | null;
}

export function useNativePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<NativePushState>({
    isSupported: false,
    permission: 'prompt',
    isRegistered: false,
    isLoading: true,
    token: null,
  });

  // Initialize and check if running on native platform
  useEffect(() => {
    const initPush = async () => {
      const isNative = Capacitor.isNativePlatform();
      
      if (!isNative) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        // Check current permission status
        const permResult = await PushNotifications.checkPermissions();
        
        setState(prev => ({
          ...prev,
          isSupported: true,
          permission: permResult.receive as 'prompt' | 'granted' | 'denied',
          isLoading: false,
        }));

        // If already granted, register and setup listeners
        if (permResult.receive === 'granted') {
          await registerPush();
        }

      } catch (error) {
        console.log('[NativePush] Not available:', error);
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
      }
    };

    initPush();
  }, []);

  // Register for push notifications
  const registerPush = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission if not granted
      const permResult = await PushNotifications.checkPermissions();
      
      if (permResult.receive === 'prompt') {
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive !== 'granted') {
          setState(prev => ({ 
            ...prev, 
            permission: 'denied', 
            isLoading: false 
          }));
          return false;
        }
      } else if (permResult.receive === 'denied') {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Register with the push notification service
      await PushNotifications.register();

      // Setup listeners
      await setupListeners();

      setState(prev => ({ 
        ...prev, 
        permission: 'granted',
        isRegistered: true, 
        isLoading: false 
      }));

      return true;

    } catch (error) {
      console.error('[NativePush] Registration error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Setup push notification listeners
  const setupListeners = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // On successful registration, save token
      await PushNotifications.addListener('registration', async (token) => {
        console.log('[NativePush] Registration token:', token.value);
        setState(prev => ({ ...prev, token: token.value }));

        // Save token to database
        await saveTokenToDatabase(token.value);
      });

      // Handle registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[NativePush] Registration error:', error);
        toast({
          title: 'Errore notifiche',
          description: 'Impossibile registrare le notifiche push',
          variant: 'destructive'
        });
      });

      // Handle received notifications (foreground)
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NativePush] Notification received:', notification);
        
        // Show as toast when app is in foreground
        toast({
          title: notification.title || 'Notifica',
          description: notification.body || '',
        });
      });

      // Handle notification tap (background/killed)
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[NativePush] Notification action:', notification);
        
        // Handle navigation based on notification data
        const data = notification.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.type === 'maintenance') {
          window.location.href = '/device-monitor';
        } else if (data?.repair_id) {
          window.location.href = `/customer/repair/${data.repair_id}`;
        }
      });

      console.log('[NativePush] Listeners setup complete');

    } catch (error) {
      console.error('[NativePush] Error setting up listeners:', error);
    }
  }, [toast]);

  // Save FCM token to database
  const saveTokenToDatabase = useCallback(async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[NativePush] No user authenticated, skipping token save');
        return;
      }

      // Create a unique endpoint for FCM tokens
      const fcmEndpoint = `fcm://${token}`;

      // Upsert to push_subscriptions table
      // For FCM, we use the token as both endpoint and auth
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: fcmEndpoint,
          p256dh: token, // Store token here for FCM
          auth: token,   // Same token
          user_agent: `Android/${Capacitor.getPlatform()}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('[NativePush] Error saving token:', error);
      } else {
        console.log('[NativePush] Token saved successfully');
      }

    } catch (error) {
      console.error('[NativePush] Error saving token:', error);
    }
  }, []);

  // Unregister from push notifications
  const unregister = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Remove all listeners
      await PushNotifications.removeAllListeners();

      // Remove token from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user && state.token) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .like('endpoint', `fcm://%`);
      }

      setState(prev => ({ 
        ...prev, 
        isRegistered: false, 
        token: null 
      }));

      return true;

    } catch (error) {
      console.error('[NativePush] Unregister error:', error);
      return false;
    }
  }, [state.token]);

  // Send a local notification (for testing)
  const sendLocalNotification = useCallback(async (
    title: string, 
    body: string, 
    data?: Record<string, unknown>
  ) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body,
          extra: data,
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
        }]
      });

    } catch (error) {
      console.log('[NativePush] Local notifications not available:', error);
      // Fallback to toast
      toast({
        title,
        description: body,
      });
    }
  }, [toast]);

  return {
    ...state,
    isGranted: state.permission === 'granted',
    register: registerPush,
    unregister,
    sendLocalNotification,
  };
}
