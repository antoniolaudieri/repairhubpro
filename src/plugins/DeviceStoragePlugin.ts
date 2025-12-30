import { registerPlugin } from '@capacitor/core';

export interface DeviceStorageInfo {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  totalGb: number;
  availableGb: number;
  usedGb: number;
  percentUsed: number;
}

export interface RamInfo {
  totalMb: number;
  availableMb: number;
  usedMb: number;
  percentUsed: number;
}

export interface SensorStatus {
  available: boolean;
  name: string;
  permission?: 'granted' | 'denied' | 'prompt';
}

export interface SensorsInfo {
  gps: SensorStatus;
  accelerometer: SensorStatus;
  gyroscope: SensorStatus;
  magnetometer: SensorStatus;
  proximity: SensorStatus;
  lightSensor: SensorStatus;
  barometer: SensorStatus;
  microphone: SensorStatus;
  camera: SensorStatus;
}

export interface BatteryAdvancedInfo {
  level: number;
  isCharging: boolean;
  temperature: number | null; // Celsius
  voltage: number | null; // mV
  technology: string | null;
  health: 'good' | 'overheat' | 'dead' | 'over_voltage' | 'unspecified_failure' | 'cold' | 'unknown';
  plugged: 'ac' | 'usb' | 'wireless' | 'none';
}

export interface AppStorageInfo {
  packageName: string;
  appName: string | null;
  totalSizeMb: number;
  appSizeMb: number;
  dataSizeMb: number;
  cacheSizeMb: number;
  isSystemApp: boolean;
  iconBase64?: string;
}

export interface AppUsageStat {
  packageName: string;
  totalTimeMs: number;
  totalTimeMinutes: number;
  lastTimeUsed: number;
}

export interface SecurityStatus {
  isRooted: boolean;
  rootMethod: string | null;
  isBootloaderUnlocked: boolean;
  verifiedBootState: string;
  isDeveloperOptionsEnabled: boolean;
  isUsbDebuggingEnabled: boolean;
  buildTags: string;
  isTestBuild: boolean;
  securityPatchLevel: string;
}

export interface DangerousPermissionApp {
  packageName: string;
  appName: string;
  permissions: string[];
  permissionCount: number;
  isSystemApp: boolean;
  iconBase64?: string;
}

export interface DeviceUptime {
  uptimeMs: number;
  uptimeSeconds: number;
  uptimeMinutes: number;
  uptimeHours: number;
  uptimeDays: number;
  lastBootTime: number;
  formattedUptime: string;
}

export interface SystemIntegrityStatus {
  systemReadOnly: boolean;
  officialBuild: boolean;
  seLinuxStatus: string;
  seLinuxEnforcing: boolean;
  systemModified: boolean;
  verifiedBootState: string;
  isEncrypted: boolean;
  integrityScore: number;
}

export interface CacheInfo {
  totalCacheBytes: number;
  totalCacheMb: number;
  totalCacheGb: number;
  appsScanned: number;
  hasPermission: boolean;
  needsPermission: boolean;
}

export interface OwnAppCacheInfo {
  cacheSizeBytes: number;
  cacheSizeMb: number;
  cacheSizeKb: number;
}

export interface ClearCacheResult {
  success: boolean;
  freedBytes: number;
  freedMb: number;
  cacheBefore?: number;
  cacheBeforeMb?: number;
}

export interface DeviceDiagnosticsPlugin {
  getStorageInfo(): Promise<DeviceStorageInfo>;
  getRamInfo(): Promise<RamInfo>;
  getSensorsInfo(): Promise<SensorsInfo>;
  getBatteryAdvancedInfo(): Promise<BatteryAdvancedInfo>;
  testSensor(options: { sensorType: string }): Promise<{ working: boolean; value?: any; error?: string }>;
  getInstalledAppsStorage(): Promise<{ apps: AppStorageInfo[] }>;
  checkUsageStatsPermission(): Promise<{ granted: boolean; error?: string }>;
  requestUsageStatsPermission(): Promise<{ granted: boolean; settingsOpened?: boolean }>;
  openAppSettings(options: { packageName: string }): Promise<{ opened: boolean }>;
  openDeviceSettings(): Promise<{ opened: boolean }>;
  getAppUsageStats(): Promise<{ stats: AppUsageStat[]; hasPermission: boolean; count?: number }>;
  getAppVersion(): Promise<{ versionName: string; versionCode: number }>;
  downloadApk(options: { url: string; fileName: string }): Promise<{ success: boolean; filePath?: string; error?: string }>;
  installApk(options: { filePath: string }): Promise<{ success: boolean; error?: string }>;
  // Security & Integrity methods
  getSecurityStatus(): Promise<SecurityStatus>;
  getDangerousPermissions(): Promise<{ apps: DangerousPermissionApp[]; totalApps: number }>;
  getDeviceUptime(): Promise<DeviceUptime>;
  checkSystemIntegrity(): Promise<SystemIntegrityStatus>;
  // Cache management
  getTotalCacheSize(): Promise<CacheInfo>;
  getOwnAppCacheSize(): Promise<OwnAppCacheInfo>;
  openStorageSettings(): Promise<{ opened: boolean; fallback?: boolean }>;
  clearAppCache(): Promise<ClearCacheResult>;
}

// This will use the native implementation on Android/iOS, or fallback to web
const DeviceDiagnostics = registerPlugin<DeviceDiagnosticsPlugin>('DeviceDiagnostics', {
  web: () => import('./DeviceStoragePluginWeb').then(m => new m.DeviceDiagnosticsWeb()),
});

export default DeviceDiagnostics;
