import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

interface AutoSyncOptions {
  centroId?: string;
  syncToServer: () => Promise<boolean>;
  enabled?: boolean;
}

export const useAutoSync = ({ centroId, syncToServer, enabled = true }: AutoSyncOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<Date | null>(null);

  // Fetch sync interval from centro settings
  const getSyncIntervalHours = useCallback(async (): Promise<number> => {
    if (!centroId) return 24; // Default 24 hours
    
    try {
      const { data, error } = await supabase
        .from('device_health_settings')
        .select('sync_interval_hours')
        .eq('centro_id', centroId)
        .maybeSingle();
      
      if (error) {
        console.log('Error fetching sync settings:', error);
        return 24;
      }
      
      return data?.sync_interval_hours || 24;
    } catch (e) {
      console.log('Failed to fetch sync interval:', e);
      return 24;
    }
  }, [centroId]);

  // Check if sync is due
  const isSyncDue = useCallback((intervalHours: number): boolean => {
    if (!lastSyncRef.current) return true;
    
    const now = new Date();
    const diff = now.getTime() - lastSyncRef.current.getTime();
    const hoursSinceLastSync = diff / (1000 * 60 * 60);
    
    return hoursSinceLastSync >= intervalHours;
  }, []);

  // Perform sync if due
  const performSyncIfDue = useCallback(async () => {
    if (!centroId || !enabled) return;
    
    const intervalHours = await getSyncIntervalHours();
    
    if (isSyncDue(intervalHours)) {
      console.log(`[AutoSync] Sync due (interval: ${intervalHours}h), syncing...`);
      const success = await syncToServer();
      if (success) {
        lastSyncRef.current = new Date();
        console.log('[AutoSync] Sync completed successfully');
      }
    }
  }, [centroId, enabled, getSyncIntervalHours, isSyncDue, syncToServer]);

  // Setup auto-sync interval
  useEffect(() => {
    if (!enabled || !centroId) return;

    const isNative = Capacitor.isNativePlatform();
    
    // Initial sync on mount
    performSyncIfDue();
    
    // Setup periodic sync (check every 15 minutes, actual sync based on settings)
    intervalRef.current = setInterval(() => {
      performSyncIfDue();
    }, 15 * 60 * 1000); // Check every 15 minutes

    // Sync on app resume (native only)
    let appStateListener: { remove: () => void } | null = null;
    
    if (isNative) {
      const setupAppListener = async () => {
        try {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('appStateChange', async ({ isActive }) => {
            if (isActive) {
              performSyncIfDue();
            }
          });
          appStateListener = handle;
        } catch (e) {
          console.log('App lifecycle listener not available');
        }
      };
      setupAppListener();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [enabled, centroId, performSyncIfDue]);

  return {
    performSyncIfDue,
    lastSync: lastSyncRef.current
  };
};
