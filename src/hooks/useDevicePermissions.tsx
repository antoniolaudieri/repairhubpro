import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
  notifications: 'granted' | 'denied' | 'prompt';
}

export const useDevicePermissions = () => {
const [permissions, setPermissions] = useState<PermissionStatus>({
    location: 'prompt',
    notifications: 'prompt',
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // On web, check via Navigator API
      try {
        const locationPerm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        const notifPerm = await navigator.permissions.query({ name: 'notifications' as PermissionName });
        
        setPermissions({
          location: locationPerm.state as 'granted' | 'denied' | 'prompt',
          notifications: notifPerm.state as 'granted' | 'denied' | 'prompt',
        });
      } catch (e) {
        console.log('Permission check not fully supported on this browser');
      }
      return;
    }

    try {
      const locationStatus = await Geolocation.checkPermissions();
      
      setPermissions(prev => ({
        ...prev,
        location: locationStatus.location as 'granted' | 'denied' | 'prompt',
      }));
    } catch (e) {
      console.error('Error checking permissions:', e);
    }
  }, []);

  const requestAllPermissions = useCallback(async () => {
    if (hasRequested || isRequesting) return;
    
    setIsRequesting(true);
    
    try {
      // Request location permission
      if (Capacitor.isNativePlatform()) {
        try {
          const locationResult = await Geolocation.requestPermissions();
          setPermissions(prev => ({
            ...prev,
            location: locationResult.location as 'granted' | 'denied' | 'prompt',
          }));
        } catch (e) {
          console.error('Location permission error:', e);
        }
      } else {
        // Web fallback - trigger geolocation request
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          setPermissions(prev => ({ ...prev, location: 'granted' }));
        } catch (e) {
          console.log('Location permission denied or timeout');
        }
      }

      // Request notification permission
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setPermissions(prev => ({
          ...prev,
          notifications: result as 'granted' | 'denied' | 'prompt',
        }));
      }

      setHasRequested(true);
    } catch (e) {
      console.error('Error requesting permissions:', e);
    } finally {
      setIsRequesting(false);
    }
  }, [hasRequested, isRequesting]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    isRequesting,
    hasRequested,
    requestAllPermissions,
    checkPermissions,
  };
};
