import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NativeDeviceData {
  // Battery
  batteryLevel: number | null;
  batteryHealth: string | null;
  isCharging: boolean;
  
  // Storage
  storageTotalGb: number | null;
  storageUsedGb: number | null;
  storageAvailableGb: number | null;
  storagePercentUsed: number | null;
  
  // RAM
  ramTotalMb: number | null;
  ramAvailableMb: number | null;
  ramPercentUsed: number | null;
  
  // Device Info
  deviceModel: string | null;
  deviceManufacturer: string | null;
  osVersion: string | null;
  platform: string;
  appVersion: string | null;
  
  // Network
  networkType: string | null;
  networkConnected: boolean;
  connectionDownlink: number | null;
  connectionEffectiveType: string | null;
  connectionRtt: number | null;
  onlineStatus: boolean;
  
  // Screen
  screenWidth: number | null;
  screenHeight: number | null;
  pixelRatio: number | null;
  colorDepth: number | null;
  orientation: string | null;
  
  // Hardware
  cpuCores: number | null;
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
  touchSupport: boolean;
  maxTouchPoints: number | null;
  
  // Locale
  timezone: string | null;
  language: string | null;
  
  // Location (optional)
  latitude: number | null;
  longitude: number | null;
  
  // Calculated
  healthScore: number;
  
  // State
  isLoading: boolean;
  error: string | null;
  lastSyncAt: Date | null;
}

const calculateHealthScore = (data: Partial<NativeDeviceData>): number => {
  let score = 100;
  let penalties = 0;
  
  // Battery penalty (max -30)
  if (data.batteryLevel !== null && data.batteryLevel !== undefined) {
    if (data.batteryLevel < 10) penalties += 30;
    else if (data.batteryLevel < 20) penalties += 25;
    else if (data.batteryLevel < 30) penalties += 15;
    else if (data.batteryLevel < 50) penalties += 5;
  }
  
  // Storage penalty (max -30)
  if (data.storagePercentUsed !== null && data.storagePercentUsed !== undefined) {
    if (data.storagePercentUsed > 95) penalties += 30;
    else if (data.storagePercentUsed > 90) penalties += 25;
    else if (data.storagePercentUsed > 85) penalties += 15;
    else if (data.storagePercentUsed > 80) penalties += 10;
    else if (data.storagePercentUsed > 70) penalties += 5;
  }
  
  // RAM penalty (max -20)
  if (data.ramPercentUsed !== null && data.ramPercentUsed !== undefined) {
    if (data.ramPercentUsed > 95) penalties += 20;
    else if (data.ramPercentUsed > 90) penalties += 15;
    else if (data.ramPercentUsed > 85) penalties += 10;
    else if (data.ramPercentUsed > 80) penalties += 5;
  }
  
  // Network penalty (max -10)
  if (!data.networkConnected || !data.onlineStatus) {
    penalties += 10;
  } else if (data.connectionEffectiveType) {
    if (data.connectionEffectiveType === 'slow-2g' || data.connectionEffectiveType === '2g') {
      penalties += 8;
    } else if (data.connectionEffectiveType === '3g') {
      penalties += 3;
    }
  }
  
  // Connection quality penalty (max -10)
  if (data.connectionRtt !== null && data.connectionRtt !== undefined) {
    if (data.connectionRtt > 1000) penalties += 10;
    else if (data.connectionRtt > 500) penalties += 5;
    else if (data.connectionRtt > 200) penalties += 2;
  }
  
  return Math.max(0, Math.min(100, score - penalties));
};

// Check if running in native Capacitor environment
const isNativePlatform = async (): Promise<boolean> => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const useNativeDeviceInfo = (centroId?: string, customerId?: string, loyaltyCardId?: string) => {
  const [data, setData] = useState<NativeDeviceData>({
    batteryLevel: null,
    batteryHealth: null,
    isCharging: false,
    storageTotalGb: null,
    storageUsedGb: null,
    storageAvailableGb: null,
    storagePercentUsed: null,
    ramTotalMb: null,
    ramAvailableMb: null,
    ramPercentUsed: null,
    deviceModel: null,
    deviceManufacturer: null,
    osVersion: null,
    platform: 'web',
    appVersion: null,
    networkType: null,
    networkConnected: true,
    connectionDownlink: null,
    connectionEffectiveType: null,
    connectionRtt: null,
    onlineStatus: true,
    screenWidth: null,
    screenHeight: null,
    pixelRatio: null,
    colorDepth: null,
    orientation: null,
    cpuCores: null,
    deviceMemoryGb: null,
    hardwareConcurrency: null,
    touchSupport: false,
    maxTouchPoints: null,
    timezone: null,
    language: null,
    latitude: null,
    longitude: null,
    healthScore: 100,
    isLoading: true,
    error: null,
    lastSyncAt: null
  });

  const collectDeviceInfo = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      // === CHECK NATIVE PLATFORM ===
      const isNative = await isNativePlatform();
      
      // === DEVICE INFO (Native only) ===
      let deviceInfo: any = null;
      let batteryInfo: any = null;
      
      if (isNative) {
        try {
          const { Device } = await import('@capacitor/device');
          deviceInfo = await Device.getInfo();
          batteryInfo = await Device.getBatteryInfo();
        } catch (e) {
          console.log('Capacitor Device plugin not available');
        }
      }
      
      // === BATTERY ===
      let batteryLevel: number | null = null;
      let isCharging = false;
      let batteryHealth = 'unknown';
      
      if (batteryInfo) {
        batteryLevel = Math.round((batteryInfo.batteryLevel || 0) * 100);
        isCharging = batteryInfo.isCharging || false;
        batteryHealth = isCharging ? 'charging' : batteryLevel > 80 ? 'good' : batteryLevel > 30 ? 'fair' : 'low';
      } else {
        try {
          const nav = navigator as any;
          if (nav.getBattery) {
            const battery = await nav.getBattery();
            batteryLevel = Math.round(battery.level * 100);
            isCharging = battery.charging;
            batteryHealth = isCharging ? 'charging' : batteryLevel > 80 ? 'good' : batteryLevel > 30 ? 'fair' : 'low';
          }
        } catch (e) {
          console.log('Battery API not available');
        }
      }
      
      // === NETWORK ===
      let networkType: string | null = null;
      let networkConnected = true;
      
      if (isNative) {
        try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          networkConnected = status.connected;
          networkType = status.connectionType;
        } catch (e) {
          console.log('Capacitor Network plugin not available');
          networkConnected = navigator.onLine;
          const conn = (navigator as any).connection;
          networkType = conn?.type || 'unknown';
        }
      } else {
        networkConnected = navigator.onLine;
        const conn = (navigator as any).connection;
        networkType = conn?.type || 'unknown';
      }
      
      // Connection quality from Navigator
      let connectionDownlink: number | null = null;
      let connectionEffectiveType: string | null = null;
      let connectionRtt: number | null = null;
      
      try {
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
          connectionDownlink = conn.downlink || null;
          connectionEffectiveType = conn.effectiveType || null;
          connectionRtt = conn.rtt || null;
        }
      } catch (e) {
        console.log('Connection API not available');
      }
      
      // === STORAGE ===
      let storageTotalGb: number | null = null;
      let storageUsedGb: number | null = null;
      let storageAvailableGb: number | null = null;
      let storagePercentUsed: number | null = null;
      
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && estimate.usage !== undefined) {
            storageTotalGb = Math.round((estimate.quota / (1024 ** 3)) * 100) / 100;
            storageUsedGb = Math.round((estimate.usage / (1024 ** 3)) * 100) / 100;
            storageAvailableGb = Math.round((storageTotalGb - storageUsedGb) * 100) / 100;
            storagePercentUsed = Math.round((estimate.usage / estimate.quota) * 100);
          }
        }
      } catch (e) {
        console.log('Storage API not available');
      }
      
      // === RAM / MEMORY ===
      let ramTotalMb: number | null = null;
      let ramAvailableMb: number | null = null;
      let ramPercentUsed: number | null = null;
      let deviceMemoryGb: number | null = null;
      
      try {
        const nav = navigator as any;
        if (nav.deviceMemory) {
          deviceMemoryGb = nav.deviceMemory;
          ramTotalMb = nav.deviceMemory * 1024;
          
          const performance = window.performance as any;
          if (performance?.memory) {
            const usedHeap = performance.memory.usedJSHeapSize / (1024 * 1024);
            ramAvailableMb = Math.round(ramTotalMb - usedHeap);
            ramPercentUsed = Math.round((usedHeap / ramTotalMb) * 100);
          }
        }
      } catch (e) {
        console.log('Memory API not available');
      }
      
      // === SCREEN ===
      const screenWidth = window.screen.width || null;
      const screenHeight = window.screen.height || null;
      const pixelRatio = window.devicePixelRatio || null;
      const colorDepth = window.screen.colorDepth || null;
      const orientation = window.screen.orientation?.type || 
        (window.innerHeight > window.innerWidth ? 'portrait-primary' : 'landscape-primary');
      
      // === HARDWARE ===
      const hardwareConcurrency = navigator.hardwareConcurrency || null;
      const cpuCores = hardwareConcurrency;
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const maxTouchPoints = navigator.maxTouchPoints || null;
      
      // === LOCALE ===
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
      const language = navigator.language || null;
      
      // === DEVICE INFO ===
      const deviceModel = deviceInfo?.model || extractDeviceFromUserAgent() || 'Unknown';
      const deviceManufacturer = deviceInfo?.manufacturer || extractManufacturerFromUserAgent() || 'Unknown';
      const osVersion = deviceInfo?.osVersion || navigator.platform || 'Unknown';
      const platform = deviceInfo?.platform || detectPlatform();
      const appVersion = '1.0.0';
      const onlineStatus = navigator.onLine;
      
      // === GEOLOCATION (optional, only if permission granted) ===
      let latitude: number | null = null;
      let longitude: number | null = null;
      
      try {
        const geo = await new Promise<GeolocationPosition | null>((resolve) => {
          if (!navigator.geolocation) {
            resolve(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { timeout: 5000, maximumAge: 60000 }
          );
        });
        if (geo) {
          latitude = geo.coords.latitude;
          longitude = geo.coords.longitude;
        }
      } catch (e) {
        console.log('Geolocation not available');
      }
      
      const newData: Partial<NativeDeviceData> = {
        batteryLevel,
        batteryHealth,
        isCharging,
        storageTotalGb,
        storageUsedGb,
        storageAvailableGb,
        storagePercentUsed,
        ramTotalMb,
        ramAvailableMb,
        ramPercentUsed,
        deviceModel,
        deviceManufacturer,
        osVersion,
        platform,
        appVersion,
        networkType,
        networkConnected,
        connectionDownlink,
        connectionEffectiveType,
        connectionRtt,
        onlineStatus,
        screenWidth,
        screenHeight,
        pixelRatio,
        colorDepth,
        orientation,
        cpuCores,
        deviceMemoryGb,
        hardwareConcurrency,
        touchSupport,
        maxTouchPoints,
        timezone,
        language,
        latitude,
        longitude,
        isLoading: false,
        error: null
      };
      
      newData.healthScore = calculateHealthScore(newData);
      
      setData(prev => ({ ...prev, ...newData } as NativeDeviceData));
      
      return newData;
    } catch (error: any) {
      console.error('Error collecting device info:', error);
      setData(prev => ({ ...prev, isLoading: false, error: error.message }));
      return null;
    }
  }, []);

  const syncToServer = useCallback(async () => {
    if (!centroId) {
      console.log('No centroId provided, skipping sync');
      return false;
    }
    
    const deviceData = await collectDeviceInfo();
    if (!deviceData) return false;
    
    try {
      const { error } = await supabase
        .from('device_health_readings')
        .insert({
          centro_id: centroId,
          customer_id: customerId || null,
          loyalty_card_id: loyaltyCardId || null,
          battery_level: deviceData.batteryLevel,
          battery_health: deviceData.batteryHealth,
          is_charging: deviceData.isCharging,
          storage_total_gb: deviceData.storageTotalGb,
          storage_used_gb: deviceData.storageUsedGb,
          storage_available_gb: deviceData.storageAvailableGb,
          storage_percent_used: deviceData.storagePercentUsed,
          ram_total_mb: deviceData.ramTotalMb,
          ram_available_mb: deviceData.ramAvailableMb,
          ram_percent_used: deviceData.ramPercentUsed,
          device_model: deviceData.deviceModel,
          device_manufacturer: deviceData.deviceManufacturer,
          os_version: deviceData.osVersion,
          platform: deviceData.platform,
          app_version: deviceData.appVersion,
          health_score: deviceData.healthScore,
          network_type: deviceData.networkType,
          network_connected: deviceData.networkConnected,
          connection_downlink: deviceData.connectionDownlink,
          connection_effective_type: deviceData.connectionEffectiveType,
          connection_rtt: deviceData.connectionRtt,
          online_status: deviceData.onlineStatus,
          screen_width: deviceData.screenWidth,
          screen_height: deviceData.screenHeight,
          pixel_ratio: deviceData.pixelRatio,
          color_depth: deviceData.colorDepth,
          orientation: deviceData.orientation,
          cpu_cores: deviceData.cpuCores,
          device_memory_gb: deviceData.deviceMemoryGb,
          hardware_concurrency: deviceData.hardwareConcurrency,
          touch_support: deviceData.touchSupport,
          max_touch_points: deviceData.maxTouchPoints,
          timezone: deviceData.timezone,
          language: deviceData.language,
          latitude: deviceData.latitude,
          longitude: deviceData.longitude
        });
      
      if (error) throw error;
      
      setData(prev => ({ ...prev, lastSyncAt: new Date() }));
      return true;
    } catch (error: any) {
      console.error('Error syncing to server:', error);
      setData(prev => ({ ...prev, error: error.message }));
      return false;
    }
  }, [centroId, customerId, loyaltyCardId, collectDeviceInfo]);

  // Initial collection on mount
  useEffect(() => {
    collectDeviceInfo();
  }, [collectDeviceInfo]);

  // Listen for network changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupNetworkListener = async () => {
      const isNative = await isNativePlatform();
      
      if (isNative) {
        try {
          const { Network } = await import('@capacitor/network');
          const handle = await Network.addListener('networkStatusChange', (status) => {
            setData(prev => ({
              ...prev,
              networkConnected: status.connected,
              networkType: status.connectionType,
              onlineStatus: status.connected
            }));
          });
          unsubscribe = () => handle.remove();
        } catch (e) {
          console.log('Capacitor Network listener not available, using web fallback');
          setupWebNetworkListener();
        }
      } else {
        setupWebNetworkListener();
      }
      
      function setupWebNetworkListener() {
        const handleOnline = () => setData(prev => ({ ...prev, onlineStatus: true, networkConnected: true }));
        const handleOffline = () => setData(prev => ({ ...prev, onlineStatus: false, networkConnected: false }));
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        unsubscribe = () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };
    
    setupNetworkListener();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return {
    ...data,
    refresh: collectDeviceInfo,
    syncToServer
  };
};

// Helper functions
function extractDeviceFromUserAgent(): string | null {
  const ua = navigator.userAgent;
  
  // iOS devices
  const iosMatch = ua.match(/(iPhone|iPad|iPod)[\s;]+([\w\s,]+)/i);
  if (iosMatch) return iosMatch[1];
  
  // Android devices
  const androidMatch = ua.match(/Android[\s\d.]+;[\s]*([\w\s]+)[\s]+Build/i);
  if (androidMatch) return androidMatch[1].trim();
  
  return null;
}

function extractManufacturerFromUserAgent(): string | null {
  const ua = navigator.userAgent.toLowerCase();
  
  const brands = ['samsung', 'huawei', 'xiaomi', 'oppo', 'vivo', 'realme', 'oneplus', 'google', 'motorola', 'lg', 'sony', 'nokia', 'asus', 'lenovo'];
  
  for (const brand of brands) {
    if (ua.includes(brand)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }
  
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'Apple';
  }
  
  return null;
}

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  
  return 'web';
}
