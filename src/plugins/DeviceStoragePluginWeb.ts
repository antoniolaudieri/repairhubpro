import { WebPlugin } from '@capacitor/core';
import type { 
  DeviceDiagnosticsPlugin, 
  DeviceStorageInfo, 
  RamInfo, 
  SensorsInfo, 
  BatteryAdvancedInfo,
  SensorStatus,
  AppStorageInfo 
} from './DeviceStoragePlugin';

export class DeviceDiagnosticsWeb extends WebPlugin implements DeviceDiagnosticsPlugin {
  
  async getStorageInfo(): Promise<DeviceStorageInfo> {
    console.log('[DeviceDiagnosticsWeb] getStorageInfo called - using web fallback');
    
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        
        console.log('[DeviceDiagnosticsWeb] Storage estimate:', { quota, usage });
        
        // Web API returns browser storage quota, not device storage
        // For a more realistic estimate on mobile browsers, we multiply the quota
        // Android WebView typically allows ~50% of device storage as quota
        const estimatedTotalBytes = quota > 0 ? quota * 2 : 64 * 1024 ** 3; // Fallback to 64GB
        const totalGb = estimatedTotalBytes / (1024 ** 3);
        const usedGb = usage / (1024 ** 3);
        const availableGb = (estimatedTotalBytes - usage) / (1024 ** 3);
        const percentUsed = estimatedTotalBytes > 0 ? (usage / estimatedTotalBytes) * 100 : 50;
        
        const result = {
          totalBytes: estimatedTotalBytes,
          availableBytes: estimatedTotalBytes - usage,
          usedBytes: usage,
          totalGb: Math.max(1, Math.round(totalGb * 10) / 10),
          availableGb: Math.max(0.5, Math.round(availableGb * 10) / 10),
          usedGb: Math.max(0.1, Math.round(usedGb * 10) / 10),
          percentUsed: Math.max(1, Math.round(percentUsed * 10) / 10)
        };
        
        console.log('[DeviceDiagnosticsWeb] Storage result:', result);
        return result;
      }
    } catch (e) {
      console.error('[DeviceDiagnosticsWeb] Storage estimate failed:', e);
    }
    
    // Fallback with reasonable defaults for a modern phone
    console.log('[DeviceDiagnosticsWeb] Using hardcoded fallback storage values');
    return {
      totalBytes: 64 * 1024 ** 3,
      availableBytes: 32 * 1024 ** 3,
      usedBytes: 32 * 1024 ** 3,
      totalGb: 64,
      availableGb: 32,
      usedGb: 32,
      percentUsed: 50
    };
  }

  async getRamInfo(): Promise<RamInfo> {
    console.log('[DeviceDiagnosticsWeb] getRamInfo called - using web fallback');
    
    const nav = navigator as any;
    
    // Try to get device memory (only gives rough estimate like 4, 8 GB)
    const deviceMemory = nav.deviceMemory;
    
    console.log('[DeviceDiagnosticsWeb] deviceMemory:', deviceMemory);
    
    if (deviceMemory && deviceMemory > 0) {
      const totalMb = deviceMemory * 1024;
      
      // Try to estimate from JS heap if available
      const performance = window.performance as any;
      if (performance?.memory) {
        const usedHeap = performance.memory.usedJSHeapSize / (1024 * 1024);
        // JS heap is just a fraction of total RAM usage
        // Estimate system + app usage as 40-70% of total
        const estimatedSystemUsage = totalMb * 0.5;
        const usedMb = Math.min(estimatedSystemUsage + usedHeap, totalMb * 0.9);
        const availableMb = totalMb - usedMb;
        const percentUsed = (usedMb / totalMb) * 100;
        
        const result = {
          totalMb: Math.round(totalMb),
          availableMb: Math.round(availableMb),
          usedMb: Math.round(usedMb),
          percentUsed: Math.round(percentUsed)
        };
        console.log('[DeviceDiagnosticsWeb] RAM result (with heap):', result);
        return result;
      }
      
      // Without heap info, estimate typical usage
      const estimatedUsedPercent = 55;
      const result = {
        totalMb: Math.round(totalMb),
        availableMb: Math.round(totalMb * (1 - estimatedUsedPercent / 100)),
        usedMb: Math.round(totalMb * (estimatedUsedPercent / 100)),
        percentUsed: estimatedUsedPercent
      };
      console.log('[DeviceDiagnosticsWeb] RAM result (estimated):', result);
      return result;
    }
    
    // Complete fallback - use reasonable defaults for a modern phone (4GB RAM)
    console.log('[DeviceDiagnosticsWeb] Using hardcoded fallback RAM values');
    return {
      totalMb: 4096,
      availableMb: 1800,
      usedMb: 2296,
      percentUsed: 56
    };
  }

  async getSensorsInfo(): Promise<SensorsInfo> {
    const checkSensor = async (name: string): Promise<SensorStatus> => {
      try {
        switch (name) {
          case 'gps':
            const gpsAvailable = 'geolocation' in navigator;
            let gpsPermission: 'granted' | 'denied' | 'prompt' = 'prompt';
            try {
              const perm = await navigator.permissions.query({ name: 'geolocation' });
              gpsPermission = perm.state as 'granted' | 'denied' | 'prompt';
            } catch {}
            return { available: gpsAvailable, name: 'GPS', permission: gpsPermission };
          
          case 'accelerometer':
            const accAvailable = 'DeviceMotionEvent' in window;
            return { available: accAvailable, name: 'Accelerometro' };
          
          case 'gyroscope':
            const gyroAvailable = 'DeviceOrientationEvent' in window;
            return { available: gyroAvailable, name: 'Giroscopio' };
          
          case 'magnetometer':
            // Check if absolute orientation is available (includes magnetometer)
            const magAvailable = 'DeviceOrientationEvent' in window && 
              'DeviceOrientationAbsoluteEvent' in window;
            return { available: magAvailable, name: 'Magnetometro' };
          
          case 'proximity':
            // Proximity sensor is rarely exposed in web APIs
            return { available: false, name: 'Prossimità' };
          
          case 'lightSensor':
            // Ambient light sensor
            const lightAvailable = 'AmbientLightSensor' in window;
            return { available: lightAvailable, name: 'Sensore Luce' };
          
          case 'barometer':
            // Barometer/pressure sensor
            const baroAvailable = 'Barometer' in window || 'PressureSensor' in window;
            return { available: baroAvailable, name: 'Barometro' };
          
          case 'microphone':
            let micPermission: 'granted' | 'denied' | 'prompt' = 'prompt';
            try {
              const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
              micPermission = perm.state as 'granted' | 'denied' | 'prompt';
            } catch {}
            return { 
              available: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices, 
              name: 'Microfono',
              permission: micPermission
            };
          
          case 'camera':
            let camPermission: 'granted' | 'denied' | 'prompt' = 'prompt';
            try {
              const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
              camPermission = perm.state as 'granted' | 'denied' | 'prompt';
            } catch {}
            return { 
              available: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices, 
              name: 'Fotocamera',
              permission: camPermission
            };
          
          default:
            return { available: false, name };
        }
      } catch (e) {
        return { available: false, name };
      }
    };

    const [gps, accelerometer, gyroscope, magnetometer, proximity, lightSensor, barometer, microphone, camera] = 
      await Promise.all([
        checkSensor('gps'),
        checkSensor('accelerometer'),
        checkSensor('gyroscope'),
        checkSensor('magnetometer'),
        checkSensor('proximity'),
        checkSensor('lightSensor'),
        checkSensor('barometer'),
        checkSensor('microphone'),
        checkSensor('camera')
      ]);

    return {
      gps,
      accelerometer,
      gyroscope,
      magnetometer,
      proximity,
      lightSensor,
      barometer,
      microphone,
      camera
    };
  }

  async getBatteryAdvancedInfo(): Promise<BatteryAdvancedInfo> {
    try {
      const nav = navigator as any;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return {
          level: Math.round(battery.level * 100),
          isCharging: battery.charging,
          temperature: null, // Not available via web API
          voltage: null, // Not available via web API
          technology: null, // Not available via web API
          health: 'unknown',
          plugged: battery.charging ? 'ac' : 'none' // Can't distinguish between AC/USB/wireless
        };
      }
    } catch (e) {
      console.error('Battery API failed:', e);
    }

    return {
      level: 50,
      isCharging: false,
      temperature: null,
      voltage: null,
      technology: null,
      health: 'unknown',
      plugged: 'none'
    };
  }

  async testSensor(options: { sensorType: string }): Promise<{ working: boolean; value?: any; error?: string }> {
    try {
      switch (options.sensorType) {
        case 'gps':
          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve({ working: false, error: 'GPS non disponibile' });
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ 
                working: true, 
                value: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
              }),
              (err) => resolve({ working: false, error: err.message }),
              { timeout: 10000, maximumAge: 0 }
            );
          });
        
        case 'accelerometer':
          return new Promise((resolve) => {
            const handler = (event: DeviceMotionEvent) => {
              window.removeEventListener('devicemotion', handler);
              if (event.accelerationIncludingGravity) {
                resolve({ 
                  working: true, 
                  value: {
                    x: event.accelerationIncludingGravity.x?.toFixed(2),
                    y: event.accelerationIncludingGravity.y?.toFixed(2),
                    z: event.accelerationIncludingGravity.z?.toFixed(2)
                  }
                });
              } else {
                resolve({ working: false, error: 'Nessun dato accelerometro' });
              }
            };
            window.addEventListener('devicemotion', handler);
            setTimeout(() => {
              window.removeEventListener('devicemotion', handler);
              resolve({ working: false, error: 'Timeout accelerometro' });
            }, 3000);
          });
        
        case 'gyroscope':
          return new Promise((resolve) => {
            const handler = (event: DeviceOrientationEvent) => {
              window.removeEventListener('deviceorientation', handler);
              if (event.alpha !== null || event.beta !== null || event.gamma !== null) {
                resolve({ 
                  working: true, 
                  value: {
                    alpha: event.alpha?.toFixed(1),
                    beta: event.beta?.toFixed(1),
                    gamma: event.gamma?.toFixed(1)
                  }
                });
              } else {
                resolve({ working: false, error: 'Nessun dato giroscopio' });
              }
            };
            window.addEventListener('deviceorientation', handler);
            setTimeout(() => {
              window.removeEventListener('deviceorientation', handler);
              resolve({ working: false, error: 'Timeout giroscopio' });
            }, 3000);
          });
        
        case 'microphone':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return { working: true, value: 'Microfono funzionante' };
          } catch (e: any) {
            return { working: false, error: e.message || 'Accesso microfono negato' };
          }
        
        case 'camera':
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            return { working: true, value: 'Fotocamera funzionante' };
          } catch (e: any) {
            return { working: false, error: e.message || 'Accesso fotocamera negato' };
          }
        
        default:
          return { working: false, error: 'Sensore non supportato' };
      }
    } catch (e: any) {
      return { working: false, error: e.message || 'Errore test sensore' };
    }
  }

  async getInstalledAppsStorage(): Promise<AppStorageInfo[]> {
    // Web cannot access installed apps - throw error to trigger "plugin required" message
    console.log('[DeviceDiagnosticsWeb] getInstalledAppsStorage: Not available on web platform');
    throw new Error('not implemented - native plugin required');
  }

  async requestUsageStatsPermission(): Promise<{ granted: boolean }> {
    // Web cannot request this permission - return false
    console.log('[DeviceDiagnosticsWeb] requestUsageStatsPermission: Not available on web platform');
    return { granted: false };
  }
}
