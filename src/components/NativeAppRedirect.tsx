import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Component that redirects to DeviceMonitor when running as native app
 * Should be placed inside BrowserRouter
 */
export const NativeAppRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;

    try {
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Only redirect from root or if on a non-device-monitor route
        const currentPath = location.pathname;
        const isDeviceMonitorRoute = currentPath.startsWith('/device-monitor');
        const isAuthRoute = currentPath === '/auth';
        
        // If on native and not already on device-monitor or auth, redirect
        if (!isDeviceMonitorRoute && !isAuthRoute && currentPath === '/') {
          console.log('[NativeAppRedirect] Detected native platform, redirecting to /device-monitor');
          navigate('/device-monitor', { replace: true });
        }
      }
    } catch (e) {
      console.log('[NativeAppRedirect] Not running in Capacitor environment');
    }
    
    setChecked(true);
  }, [navigate, location.pathname, checked]);

  return null;
};
