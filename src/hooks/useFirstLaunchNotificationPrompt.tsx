import { useEffect, useRef, useState } from "react";
import { useUnifiedPushNotifications } from "@/hooks/useUnifiedPushNotifications";
import { toast } from "sonner";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/utils/safeStorage";

const FIRST_LAUNCH_KEY = "repairhubpro_notification_prompted";

/**
 * Hook that prompts for push notification permission on first app launch
 * Shows a toast notification encouraging users to enable push notifications
 */
export function useFirstLaunchNotificationPrompt() {
  const { isSupported, isGranted, isSubscribed, isLoading, subscribe } = useUnifiedPushNotifications();
  const hasPrompted = useRef(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  
  // Permission is considered denied if not granted and not loading
  const permissionDenied = !isGranted && !isLoading && isSupported;

  useEffect(() => {
    // Check if this is the first launch - use safe storage access
    const hasBeenPrompted = safeGetItem(FIRST_LAUNCH_KEY);
    if (!hasBeenPrompted) {
      setIsFirstLaunch(true);
    }
  }, []);

  useEffect(() => {
    const promptForNotifications = async () => {
      // Skip if already prompted in this session, not first launch, or still loading
      if (
        hasPrompted.current ||
        !isFirstLaunch ||
        isLoading ||
        !isSupported ||
        isSubscribed
      ) {
        return;
      }

      // Wait for the app to fully load
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Mark as prompted
      hasPrompted.current = true;

      // Show prompt toast
      toast.info("🔔 Attiva le notifiche push", {
        description: "Ricevi aggiornamenti su prenotazioni, manutenzioni e offerte speciali",
        duration: 15000,
        action: {
          label: "Attiva",
          onClick: async () => {
            const success = await subscribe();
            if (success) {
              toast.success("Notifiche attivate! 🎉", {
                description: "Riceverai aggiornamenti anche quando l'app è chiusa",
              });
              // Mark as prompted permanently
              safeSetItem(FIRST_LAUNCH_KEY, "true");
            } else {
              if (permissionDenied) {
                toast.error("Notifiche bloccate", {
                  description: "Vai nelle impostazioni del dispositivo per abilitarle",
                });
              } else {
                toast.error("Impossibile attivare le notifiche");
              }
            }
          },
        },
        cancel: {
          label: "Dopo",
          onClick: () => {
            // Mark as prompted so we don't ask again this session
            // but don't save to localStorage so we ask next time
          },
        },
      });
    };

    promptForNotifications();
  }, [isFirstLaunch, isLoading, isSupported, isSubscribed, permissionDenied, subscribe]);

  // Function to mark as prompted (call after successful subscription from settings)
  const markAsPrompted = () => {
    safeSetItem(FIRST_LAUNCH_KEY, "true");
    setIsFirstLaunch(false);
  };

  // Function to reset (for testing)
  const resetPrompt = () => {
    safeRemoveItem(FIRST_LAUNCH_KEY);
    setIsFirstLaunch(true);
    hasPrompted.current = false;
  };

  return {
    isFirstLaunch,
    markAsPrompted,
    resetPrompt,
  };
}
