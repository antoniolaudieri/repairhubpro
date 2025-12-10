import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/config/vapid";

interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: true,
  });

  // Check if Push is supported and get current state
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 
        "Notification" in window && 
        "serviceWorker" in navigator && 
        "PushManager" in window;

      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      const permission = Notification.permission;
      
      // Check if already subscribed
      let isSubscribed = false;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      } catch (error) {
        console.error("Error checking push subscription:", error);
      }

      setState({
        isSupported: true,
        permission,
        isSubscribed,
        isLoading: false,
      });
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !VAPID_PUBLIC_KEY) {
      console.error("Push notifications not supported or VAPID key missing");
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(prev => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Wait for the service worker to be ready (VitePWA handles registration)
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready for push:', registration.scope);

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract subscription data
      const subscriptionJSON = subscription.toJSON();
      const { endpoint, keys } = subscriptionJSON;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Invalid subscription data");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Save subscription to database
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,endpoint",
        });

      if (error) {
        console.error("Error saving push subscription:", error);
        throw error;
      }

      console.log("Push subscription saved successfully");
      setState(prev => ({ 
        ...prev, 
        permission: "granted", 
        isSubscribed: true, 
        isLoading: false 
      }));
      return true;

    } catch (error) {
      console.error("Error subscribing to push:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      return true;

    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Send a local notification (for testing and fallback)
  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!state.isSupported || state.permission !== "granted") {
        console.log("Push notifications not available or not permitted");
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
        };

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [state.isSupported, state.permission]
  );

  return {
    ...state,
    isGranted: state.permission === "granted",
    subscribe,
    unsubscribe,
    sendLocalNotification,
    // Legacy compatibility
    requestPermission: subscribe,
    sendNotification: sendLocalNotification,
  };
}
