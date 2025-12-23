import { useEffect, useState } from 'react';
import { RefreshCw, Cloud, Smartphone, Battery, HardDrive, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DeviceData {
  batteryLevel: number | null;
  isCharging: boolean;
  storageTotalGb: number | null;
  storageUsedGb: number | null;
  storagePercentUsed: number | null;
  ramTotalMb: number | null;
  ramAvailableMb: number | null;
  networkType: string | null;
  networkConnected: boolean;
  deviceModel: string | null;
  deviceManufacturer: string | null;
  osVersion: string | null;
  platform: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  healthScore: number;
}

/**
 * Simple Device Monitor - Standalone version without auth dependencies
 * This is designed to work reliably on Android native apps
 */
const SimpleDeviceMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceData>({
    batteryLevel: null,
    isCharging: false,
    storageTotalGb: null,
    storageUsedGb: null,
    storagePercentUsed: null,
    ramTotalMb: null,
    ramAvailableMb: null,
    networkType: null,
    networkConnected: true,
    deviceModel: null,
    deviceManufacturer: null,
    osVersion: null,
    platform: null,
    screenWidth: null,
    screenHeight: null,
    healthScore: 0,
  });

  const collectDeviceInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data: DeviceData = {
        batteryLevel: null,
        isCharging: false,
        storageTotalGb: null,
        storageUsedGb: null,
        storagePercentUsed: null,
        ramTotalMb: null,
        ramAvailableMb: null,
        networkType: null,
        networkConnected: true,
        deviceModel: null,
        deviceManufacturer: null,
        osVersion: null,
        platform: null,
        screenWidth: window.screen?.width || null,
        screenHeight: window.screen?.height || null,
        healthScore: 0,
      };

      // Try to get battery info (Web API)
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();
          data.batteryLevel = Math.round(battery.level * 100);
          data.isCharging = battery.charging;
        }
      } catch (e) {
        console.log('Battery API not available');
      }

      // Try to get storage info (Web API)
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          if (estimate.quota && estimate.usage) {
            data.storageTotalGb = Math.round((estimate.quota / (1024 * 1024 * 1024)) * 10) / 10;
            data.storageUsedGb = Math.round((estimate.usage / (1024 * 1024 * 1024)) * 10) / 10;
            data.storagePercentUsed = Math.round((estimate.usage / estimate.quota) * 100);
          }
        }
      } catch (e) {
        console.log('Storage API not available');
      }

      // Try to get network info
      try {
        const connection = (navigator as any).connection || 
                          (navigator as any).mozConnection || 
                          (navigator as any).webkitConnection;
        if (connection) {
          data.networkType = connection.effectiveType || connection.type || null;
        }
        data.networkConnected = navigator.onLine;
      } catch (e) {
        console.log('Network API not available');
      }

      // Get RAM info
      try {
        const deviceMemory = (navigator as any).deviceMemory;
        if (deviceMemory) {
          data.ramTotalMb = deviceMemory * 1024;
          data.ramAvailableMb = deviceMemory * 1024 * 0.5; // Estimate
        }
      } catch (e) {
        console.log('Device memory not available');
      }

      // Parse user agent for device info
      const ua = navigator.userAgent;
      data.platform = /android/i.test(ua) ? 'android' : /iphone|ipad/i.test(ua) ? 'ios' : 'web';
      
      // Try to extract device model from user agent
      const androidMatch = ua.match(/Android.*?;\s*([^)]+)/);
      if (androidMatch) {
        const parts = androidMatch[1].split(' Build');
        data.deviceModel = parts[0]?.trim() || null;
      }

      // Extract OS version
      const androidVersionMatch = ua.match(/Android\s*([\d.]+)/);
      if (androidVersionMatch) {
        data.osVersion = `Android ${androidVersionMatch[1]}`;
      }

      // Calculate health score
      let score = 100;
      if (data.batteryLevel !== null && data.batteryLevel < 20) score -= 20;
      if (data.storagePercentUsed !== null && data.storagePercentUsed > 80) score -= 20;
      data.healthScore = Math.max(0, Math.min(100, score));

      // Try Capacitor plugins if available
      try {
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        const battery = await Device.getBatteryInfo();
        
        data.deviceModel = info.model || data.deviceModel;
        data.deviceManufacturer = info.manufacturer || null;
        data.osVersion = `${info.platform} ${info.osVersion}` || data.osVersion;
        data.platform = info.platform || data.platform;
        data.batteryLevel = battery.batteryLevel ? Math.round(battery.batteryLevel * 100) : data.batteryLevel;
        data.isCharging = battery.isCharging || false;
      } catch (e) {
        console.log('Capacitor Device plugin not available');
      }

      setDeviceData(data);
    } catch (e: any) {
      setError(e.message || 'Errore durante la raccolta dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync - in real app would send to Supabase
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSyncing(false);
  };

  useEffect(() => {
    collectDeviceInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Analisi dispositivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Smartphone className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold">Device Monitor</h1>
            <p className="text-xs opacity-80">Monitoraggio Dispositivo</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-24">
        {/* Health Score */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-6 text-center">
            <div className="text-5xl font-bold text-primary mb-2">
              {deviceData.healthScore}%
            </div>
            <p className="text-muted-foreground">Health Score</p>
          </CardContent>
        </Card>

        {/* Battery */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Battery className="h-5 w-5" />
              Batteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceData.batteryLevel !== null ? `${deviceData.batteryLevel}%` : 'N/A'}
            </div>
            {deviceData.isCharging && (
              <p className="text-sm text-green-500">In carica</p>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-5 w-5" />
              Archiviazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceData.storageTotalGb !== null ? (
              <>
                <div className="text-2xl font-bold">
                  {deviceData.storagePercentUsed}% usato
                </div>
                <p className="text-sm text-muted-foreground">
                  {deviceData.storageUsedGb} GB di {deviceData.storageTotalGb} GB
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Non disponibile</div>
            )}
          </CardContent>
        </Card>

        {/* Network */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-5 w-5" />
              Connessione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deviceData.networkConnected ? 'Online' : 'Offline'}
            </div>
            {deviceData.networkType && (
              <p className="text-sm text-muted-foreground">
                Tipo: {deviceData.networkType}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Device Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5" />
              Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {deviceData.deviceModel && (
              <p><span className="text-muted-foreground">Modello:</span> {deviceData.deviceModel}</p>
            )}
            {deviceData.deviceManufacturer && (
              <p><span className="text-muted-foreground">Produttore:</span> {deviceData.deviceManufacturer}</p>
            )}
            {deviceData.osVersion && (
              <p><span className="text-muted-foreground">Sistema:</span> {deviceData.osVersion}</p>
            )}
            {deviceData.screenWidth && deviceData.screenHeight && (
              <p><span className="text-muted-foreground">Schermo:</span> {deviceData.screenWidth}x{deviceData.screenHeight}</p>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t space-y-2">
        <Button 
          className="w-full" 
          variant="outline"
          onClick={collectDeviceInfo}
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna Dati
        </Button>
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Sincronizzazione...
            </>
          ) : (
            <>
              <Cloud className="h-5 w-5 mr-2" />
              Sincronizza
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SimpleDeviceMonitor;
