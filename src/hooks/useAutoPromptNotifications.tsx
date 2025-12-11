import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

/**
 * Hook that automatically prompts for push notification permission
 * after successful login for non-customer roles
 */
export function useAutoPromptNotifications() {
  const { user, loading: authLoading, isCustomer, userRoles } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe, isLoading } = usePushNotifications();
  const hasPrompted = useRef(false);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    // Reset when user changes (new login)
    if (user?.id !== previousUserId.current) {
      hasPrompted.current = false;
      previousUserId.current = user?.id || null;
    }
  }, [user?.id]);

  useEffect(() => {
    const promptForNotifications = async () => {
      // Skip if already prompted, not supported, loading, or already subscribed
      if (
        hasPrompted.current ||
        !isSupported ||
        isLoading ||
        authLoading ||
        !user ||
        userRoles.length === 0 ||
        isSubscribed ||
        permission === "denied"
      ) {
        return;
      }

      // Only prompt for business users (not customers)
      if (isCustomer && userRoles.length === 1) {
        return;
      }

      // Wait a bit for the page to load before prompting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mark as prompted to avoid multiple prompts
      hasPrompted.current = true;

      // If permission is default, show a toast to encourage enabling notifications
      if (permission === "default") {
        toast.info("Abilita le notifiche push per ricevere aggiornamenti in tempo reale", {
          duration: 8000,
          action: {
            label: "Abilita",
            onClick: async () => {
              const success = await subscribe();
              if (success) {
                toast.success("Notifiche push abilitate!");
              } else {
                toast.error("Impossibile abilitare le notifiche");
              }
            },
          },
        });
      }
    };

    promptForNotifications();
  }, [
    user,
    userRoles,
    authLoading,
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isCustomer,
    subscribe,
  ]);
}
