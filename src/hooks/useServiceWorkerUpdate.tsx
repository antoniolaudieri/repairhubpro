import { useEffect, useState, useCallback } from "react";

interface UseServiceWorkerUpdateReturn {
  needRefresh: boolean;
  updateServiceWorker: () => void;
}

export const useServiceWorkerUpdate = (): UseServiceWorkerUpdateReturn => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload the page to use the new service worker
    window.location.reload();
  }, [registration]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        setRegistration(reg);

        // Check if there's already a waiting worker
        if (reg.waiting) {
          setNeedRefresh(true);
        }

        // Listen for new service worker installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              setNeedRefresh(true);
            }
          });
        });

        // Listen for the controlling service worker changing
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // New service worker has taken control, reload if we triggered this
          if (needRefresh) {
            window.location.reload();
          }
        });

        // Periodically check for updates (every 60 seconds)
        const checkForUpdates = () => {
          reg.update().catch(console.error);
        };

        const interval = setInterval(checkForUpdates, 60 * 1000);

        // Also check when the page becomes visible
        const handleVisibility = () => {
          if (document.visibilityState === 'visible') {
            checkForUpdates();
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
          clearInterval(interval);
          document.removeEventListener('visibilitychange', handleVisibility);
        };
      } catch (error) {
        console.error('Service worker update check failed:', error);
      }
    };

    handleUpdate();
  }, [needRefresh]);

  return { needRefresh, updateServiceWorker };
};
