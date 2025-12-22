import { useState, useEffect, useCallback } from 'react';
import { Device, DeviceInfo, BatteryInfo } from '@capacitor/device';
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
  
  // RAM (estimated from web APIs when available)
  ramTotalMb: number | null;
  ramAvailableMb: number | null;
  ramPercentUsed: number | null;
  
  // Device Info
  deviceModel: string | null;
  deviceManufacturer: string | null;
  osVersion: string | null;
  platform: string;
  appVersion: string | null;
  
  // Calculated
  healthScore: number;
  
  // State
  isLoading: boolean;
  error: string | null;
  lastSyncAt: Date | null;
}

const calculateHealthScore = (data: Partial<NativeDeviceData>): number => {
  let score = 100;
  
  // Battery penalty
  if (data.batteryLevel !== null && data.batteryLevel !== undefined) {
    if (data.batteryLevel < 20) score -= 30;
    else if (data.batteryLevel < 50) score -= 15;
  }
  
  // Storage penalty
  if (data.storagePercentUsed !== null && data.storagePercentUsed !== undefined) {
    if (data.storagePercentUsed > 90) score -= 30;
    else if (data.storagePercentUsed > 80) score -= 15;
    else if (data.storagePercentUsed > 70) score -= 5;
  }
  
  // RAM penalty
  if (data.ramPercentUsed !== null && data.ramPercentUsed !== undefined) {
    if (data.ramPercentUsed > 90) score -= 20;
    else if (data.ramPercentUsed > 80) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
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
    healthScore: 100,
    isLoading: true,
    error: null,
    lastSyncAt: null
  });

  const collectDeviceInfo = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get device info using Capacitor
      let deviceInfo: DeviceInfo | null = null;
      let batteryInfo: BatteryInfo | null = null;
      
      try {
        deviceInfo = await Device.getInfo();
        batteryInfo = await Device.getBatteryInfo();
      } catch (e) {
        console.log('Running in web mode, using fallback APIs');
      }
      
      // Fallback for web: use Navigator APIs
      let batteryLevel: number | null = null;
      let isCharging = false;
      let batteryHealth = 'unknown';
      
      if (batteryInfo) {
        batteryLevel = Math.round((batteryInfo.batteryLevel || 0) * 100);
        isCharging = batteryInfo.isCharging || false;
        batteryHealth = isCharging ? 'charging' : 'good';
      } else {
        // Web fallback using Battery API
        try {
          const nav = navigator as any;
          if (nav.getBattery) {
            const battery = await nav.getBattery();
            batteryLevel = Math.round(battery.level * 100);
            isCharging = battery.charging;
            batteryHealth = isCharging ? 'charging' : 'good';
          }
        } catch (e) {
          console.log('Battery API not available');
        }
      }
      
      // Storage estimation (web)
      let storageTotalGb: number | null = null;
      let storageUsedGb: number | null = null;
      let storageAvailableGb: number | null = null;
      let storagePercentUsed: number | null = null;
      
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && estimate.usage) {
            storageTotalGb = Math.round((estimate.quota / (1024 ** 3)) * 100) / 100;
            storageUsedGb = Math.round((estimate.usage / (1024 ** 3)) * 100) / 100;
            storageAvailableGb = storageTotalGb - storageUsedGb;
            storagePercentUsed = Math.round((estimate.usage / estimate.quota) * 100);
          }
        }
      } catch (e) {
        console.log('Storage API not available');
      }
      
      // RAM estimation (web)
      let ramTotalMb: number | null = null;
      let ramAvailableMb: number | null = null;
      let ramPercentUsed: number | null = null;
      
      try {
        const nav = navigator as any;
        if (nav.deviceMemory) {
          ramTotalMb = nav.deviceMemory * 1024; // deviceMemory is in GB
          // Estimate used RAM (not accurate but gives an idea)
          const performance = window.performance as any;
          if (performance?.memory) {
            const usedHeap = performance.memory.usedJSHeapSize / (1024 * 1024);
            ramAvailableMb = ramTotalMb - usedHeap;
            ramPercentUsed = Math.round((usedHeap / ramTotalMb) * 100);
          }
        }
      } catch (e) {
        console.log('Memory API not available');
      }
      
      // Device info
      const deviceModel = deviceInfo?.model || navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown';
      const deviceManufacturer = deviceInfo?.manufacturer || 'Unknown';
      const osVersion = deviceInfo?.osVersion || navigator.platform || 'Unknown';
      const platform = deviceInfo?.platform || 'web';
      const appVersion = '1.0.0'; // Can be fetched from package.json or app config
      
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
          health_score: deviceData.healthScore
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

  return {
    ...data,
    refresh: collectDeviceInfo,
    syncToServer
  };
};
