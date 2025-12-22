import { useState, useEffect, useCallback } from 'react';

export interface DeviceInfo {
  // Platform detection
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isPWA: boolean;
  
  // Device model
  model: string | null;
  manufacturer: string | null;
  modelConfidence: 'exact' | 'approximate' | 'unknown';
  
  // OS info
  osVersion: string | null;
  
  // Battery (Android only via Battery Status API)
  battery: {
    level: number | null; // 0-100
    charging: boolean | null;
    chargingTime: number | null; // seconds
    dischargingTime: number | null; // seconds
    supported: boolean;
  };
  
  // Storage (via Storage Manager API)
  storage: {
    total: number | null; // bytes
    used: number | null; // bytes
    available: number | null; // bytes
    percentUsed: number | null;
    supported: boolean;
  };
  
  // RAM (Chrome/Android only)
  memory: {
    deviceMemory: number | null; // GB (approximate)
    supported: boolean;
  };
  
  // CPU
  cpu: {
    cores: number | null;
    supported: boolean;
  };
  
  // Screen
  screen: {
    width: number;
    height: number;
    dpr: number; // Device Pixel Ratio
    orientation: 'portrait' | 'landscape';
    touchSupported: boolean;
  };
  
  // Network (Android only via Network Information API)
  network: {
    type: string | null; // wifi, cellular, 4g, 5g, etc.
    effectiveType: string | null; // slow-2g, 2g, 3g, 4g
    downlink: number | null; // Mbps
    rtt: number | null; // milliseconds
    saveData: boolean;
    supported: boolean;
  };
  
  // Motion sensors (iOS requires permission)
  motion: {
    supported: boolean;
    permissionGranted: boolean;
  };
  
  // Loading state
  loading: boolean;
  error: string | null;
}

// User Agent Client Hints types
interface NavigatorUAData {
  brands: Array<{ brand: string; version: string }>;
  mobile: boolean;
  platform: string;
  getHighEntropyValues: (hints: string[]) => Promise<{
    model?: string;
    platformVersion?: string;
    architecture?: string;
    bitness?: string;
    fullVersionList?: Array<{ brand: string; version: string }>;
    uaFullVersion?: string;
  }>;
}

// Battery Manager types
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

// Network Information API types
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

// Extend Navigator types
declare global {
  interface Navigator {
    userAgentData?: NavigatorUAData;
    getBattery?: () => Promise<BatteryManager>;
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
    deviceMemory?: number;
  }
}

const parseUserAgent = (ua: string): { platform: 'ios' | 'android' | 'desktop' | 'unknown'; model: string | null; manufacturer: string | null; osVersion: string | null } => {
  const result: { platform: 'ios' | 'android' | 'desktop' | 'unknown'; model: string | null; manufacturer: string | null; osVersion: string | null } = {
    platform: 'unknown',
    model: null,
    manufacturer: null,
    osVersion: null
  };
  
  // Detect iOS
  if (/iPhone|iPad|iPod/.test(ua)) {
    result.platform = 'ios';
    result.manufacturer = 'Apple';
    
    // Parse iOS version
    const iosMatch = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
    if (iosMatch) {
      result.osVersion = iosMatch[1].replace(/_/g, '.');
    }
    
    // Parse iPhone model (approximate from UA)
    if (/iPhone/.test(ua)) {
      // Try to extract iPhone model from screen size
      const screenHeight = window.screen.height;
      const dpr = window.devicePixelRatio;
      
      if (screenHeight >= 932 && dpr >= 3) result.model = 'iPhone 15 Pro Max / 14 Pro Max';
      else if (screenHeight >= 852 && dpr >= 3) result.model = 'iPhone 15 Pro / 14 Pro';
      else if (screenHeight >= 844 && dpr >= 3) result.model = 'iPhone 15 / 14 / 13';
      else if (screenHeight >= 812 && dpr >= 3) result.model = 'iPhone X/XS/11 Pro/12 Mini/13 Mini';
      else if (screenHeight >= 736 && dpr >= 3) result.model = 'iPhone 8 Plus / 7 Plus / 6s Plus';
      else if (screenHeight >= 667) result.model = 'iPhone 8 / 7 / 6s / SE';
      else result.model = 'iPhone';
    } else if (/iPad/.test(ua)) {
      result.model = 'iPad';
    }
  }
  // Detect Android
  else if (/Android/.test(ua)) {
    result.platform = 'android';
    
    // Parse Android version
    const androidMatch = ua.match(/Android (\d+\.?\d*\.?\d*)/);
    if (androidMatch) {
      result.osVersion = androidMatch[1];
    }
    
    // Try to parse device model from UA
    // Format: Android X.X; MANUFACTURER MODEL Build/...
    const modelMatch = ua.match(/Android [^;]+;\s*([^)]+?)\s*(?:Build|MIUI)/);
    if (modelMatch) {
      const modelString = modelMatch[1].trim();
      
      // Known manufacturers
      const manufacturers = ['Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Motorola', 'LG', 'Sony', 'OPPO', 'Vivo', 'Realme', 'Honor', 'Asus', 'Nokia'];
      
      for (const mfr of manufacturers) {
        if (modelString.toLowerCase().includes(mfr.toLowerCase())) {
          result.manufacturer = mfr;
          result.model = modelString;
          break;
        }
      }
      
      if (!result.manufacturer) {
        result.model = modelString;
      }
    }
  }
  // Desktop
  else if (/Windows|Macintosh|Linux/.test(ua) && !/Android/.test(ua)) {
    result.platform = 'desktop';
    if (/Windows/.test(ua)) result.manufacturer = 'Windows';
    else if (/Macintosh/.test(ua)) result.manufacturer = 'Apple';
    else result.manufacturer = 'Linux';
  }
  
  return result;
};

export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    platform: 'unknown',
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isPWA: false,
    model: null,
    manufacturer: null,
    modelConfidence: 'unknown',
    osVersion: null,
    battery: { level: null, charging: null, chargingTime: null, dischargingTime: null, supported: false },
    storage: { total: null, used: null, available: null, percentUsed: null, supported: false },
    memory: { deviceMemory: null, supported: false },
    cpu: { cores: null, supported: false },
    screen: { 
      width: window.screen.width, 
      height: window.screen.height, 
      dpr: window.devicePixelRatio, 
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      touchSupported: 'ontouchstart' in window
    },
    network: { type: null, effectiveType: null, downlink: null, rtt: null, saveData: false, supported: false },
    motion: { supported: false, permissionGranted: false },
    loading: true,
    error: null
  });

  const detectDeviceInfo = useCallback(async () => {
    try {
      const ua = navigator.userAgent;
      const basicInfo = parseUserAgent(ua);
      
      let model = basicInfo.model;
      let manufacturer = basicInfo.manufacturer;
      let modelConfidence: 'exact' | 'approximate' | 'unknown' = basicInfo.model ? 'approximate' : 'unknown';
      
      // Try User-Agent Client Hints for exact model (Chrome/Android)
      if (navigator.userAgentData) {
        try {
          const hints = await navigator.userAgentData.getHighEntropyValues([
            'model',
            'platformVersion',
            'architecture'
          ]);
          
          if (hints.model) {
            model = hints.model;
            modelConfidence = 'exact';
          }
          if (hints.platformVersion && basicInfo.platform === 'android') {
            basicInfo.osVersion = hints.platformVersion;
          }
        } catch (e) {
          console.log('High entropy hints not available');
        }
      }
      
      // Battery Status API (Android/Chrome)
      let batteryInfo = { level: null as number | null, charging: null as boolean | null, chargingTime: null as number | null, dischargingTime: null as number | null, supported: false };
      if (navigator.getBattery) {
        try {
          const battery = await navigator.getBattery();
          batteryInfo = {
            level: Math.round(battery.level * 100),
            charging: battery.charging,
            chargingTime: battery.chargingTime === Infinity ? null : battery.chargingTime,
            dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
            supported: true
          };
        } catch (e) {
          console.log('Battery API not available');
        }
      }
      
      // Storage Manager API
      let storageInfo = { total: null as number | null, used: null as number | null, available: null as number | null, percentUsed: null as number | null, supported: false };
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && estimate.usage !== undefined) {
            storageInfo = {
              total: estimate.quota,
              used: estimate.usage,
              available: estimate.quota - estimate.usage,
              percentUsed: Math.round((estimate.usage / estimate.quota) * 100),
              supported: true
            };
          }
        } catch (e) {
          console.log('Storage API not available');
        }
      }
      
      // Device Memory API (Chrome/Android only)
      let memoryInfo = { deviceMemory: null as number | null, supported: false };
      if (navigator.deviceMemory) {
        memoryInfo = {
          deviceMemory: navigator.deviceMemory,
          supported: true
        };
      }
      
      // CPU cores
      let cpuInfo = { cores: null as number | null, supported: false };
      if (navigator.hardwareConcurrency) {
        cpuInfo = {
          cores: navigator.hardwareConcurrency,
          supported: true
        };
      }
      
      // Network Information API
      let networkInfo = { type: null as string | null, effectiveType: null as string | null, downlink: null as number | null, rtt: null as number | null, saveData: false, supported: false };
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        networkInfo = {
          type: connection.type || null,
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink || null,
          rtt: connection.rtt || null,
          saveData: connection.saveData || false,
          supported: true
        };
      }
      
      // Motion sensors
      let motionInfo = { supported: false, permissionGranted: false };
      if (typeof DeviceMotionEvent !== 'undefined') {
        motionInfo.supported = true;
        // Check if permission API exists (iOS 13+)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          // Permission not yet requested, will need user interaction
          motionInfo.permissionGranted = false;
        } else {
          // No permission needed (Android, old iOS)
          motionInfo.permissionGranted = true;
        }
      }
      
      // PWA detection
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://');
      
      setDeviceInfo({
        platform: basicInfo.platform,
        isIOS: basicInfo.platform === 'ios',
        isAndroid: basicInfo.platform === 'android',
        isMobile: basicInfo.platform === 'ios' || basicInfo.platform === 'android',
        isPWA,
        model,
        manufacturer,
        modelConfidence,
        osVersion: basicInfo.osVersion,
        battery: batteryInfo,
        storage: storageInfo,
        memory: memoryInfo,
        cpu: cpuInfo,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          dpr: window.devicePixelRatio,
          orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
          touchSupported: 'ontouchstart' in window
        },
        network: networkInfo,
        motion: motionInfo,
        loading: false,
        error: null
      });
      
    } catch (error) {
      console.error('Error detecting device info:', error);
      setDeviceInfo(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Errore nel rilevamento dispositivo'
      }));
    }
  }, []);

  const requestMotionPermission = useCallback(async (): Promise<boolean> => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        const granted = permission === 'granted';
        setDeviceInfo(prev => ({
          ...prev,
          motion: { ...prev.motion, permissionGranted: granted }
        }));
        return granted;
      } catch (e) {
        console.error('Motion permission request failed:', e);
        return false;
      }
    }
    return true;
  }, []);

  useEffect(() => {
    detectDeviceInfo();
  }, [detectDeviceInfo]);

  // Return with additional method
  return {
    ...deviceInfo,
    // @ts-ignore - adding method
    requestMotionPermission
  };
}

// Helper to format bytes
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'N/D';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// Helper to get health status from value
export function getHealthStatus(value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'critical' {
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.warning) return 'warning';
  return 'critical';
}
