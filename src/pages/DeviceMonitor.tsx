import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RefreshCw, Bell, Cloud, CloudOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNativeDeviceInfo } from '@/hooks/useNativeDeviceInfo';
import { 
  BatteryWidget, 
  StorageWidget, 
  DeviceInfoWidget, 
  HealthScoreWidget,
  RamWidget 
} from '@/components/monitor';
import { PushNotifications } from '@capacitor/push-notifications';
import { App } from '@capacitor/app';

interface CentroInfo {
  id: string;
  business_name: string;
  logo_url: string | null;
}

const DeviceMonitor = () => {
  const { centroId } = useParams<{ centroId: string }>();
  const { toast } = useToast();
  const [centro, setCentro] = useState<CentroInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const deviceInfo = useNativeDeviceInfo(centroId);

  // Fetch centro info
  useEffect(() => {
    const fetchCentro = async () => {
      if (!centroId) return;
      
      try {
        const { data, error } = await supabase
          .from('centri_assistenza')
          .select('id, business_name, logo_url')
          .eq('id', centroId)
          .single();
        
        if (error) throw error;
        setCentro(data);
      } catch (error: any) {
        console.error('Error fetching centro:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare le info del centro',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCentro();
  }, [centroId, toast]);

  // Setup push notifications
  useEffect(() => {
    const setupPush = async () => {
      try {
        // Check if we're in a native environment
        const result = await PushNotifications.checkPermissions();
        
        if (result.receive === 'prompt') {
          const requestResult = await PushNotifications.requestPermissions();
          setPushEnabled(requestResult.receive === 'granted');
        } else {
          setPushEnabled(result.receive === 'granted');
        }

        if (result.receive === 'granted') {
          await PushNotifications.register();
          
          // Handle push notification events
          PushNotifications.addListener('pushNotificationReceived', notification => {
            toast({
              title: notification.title || 'Notifica',
              description: notification.body || ''
            });
          });
          
          PushNotifications.addListener('pushNotificationActionPerformed', action => {
            console.log('Push action performed:', action);
          });
        }
      } catch (e) {
        console.log('Push notifications not available (web environment)');
      }
    };
    
    setupPush();
  }, [toast]);

  // Handle app lifecycle for background sync
  useEffect(() => {
    const setupAppLifecycle = async () => {
      try {
        App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            // App came to foreground - refresh data
            deviceInfo.refresh();
          } else {
            // App went to background - sync data
            await deviceInfo.syncToServer();
          }
        });
      } catch (e) {
        console.log('App lifecycle not available (web environment)');
      }
    };
    
    setupAppLifecycle();
  }, [deviceInfo]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const success = await deviceInfo.syncToServer();
      if (success) {
        toast({
          title: 'Sincronizzato',
          description: 'Dati del dispositivo inviati al centro'
        });
      } else {
        throw new Error('Sync failed');
      }
    } catch (error: any) {
      toast({
        title: 'Errore sync',
        description: error.message || 'Impossibile sincronizzare',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRefresh = () => {
    deviceInfo.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Centro branding */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center gap-3">
          {centro?.logo_url ? (
            <img 
              src={centro.logo_url} 
              alt={centro.business_name}
              className="h-12 w-12 rounded-full object-cover border-2 border-primary-foreground/20"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Settings className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold truncate">
              {centro?.business_name || 'Device Monitor'}
            </h1>
            <p className="text-xs text-primary-foreground/70">
              Monitoraggio Dispositivo
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pushEnabled ? (
              <Bell className="h-5 w-5 text-primary-foreground/80" />
            ) : (
              <Bell className="h-5 w-5 text-primary-foreground/40" />
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 space-y-4 pb-24">
        {/* Health Score - Featured */}
        <HealthScoreWidget 
          score={deviceInfo.healthScore} 
          lastSyncAt={deviceInfo.lastSyncAt}
        />

        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {deviceInfo.lastSyncAt ? (
                  <>
                    <Cloud className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Connesso al centro
                    </span>
                  </>
                ) : (
                  <>
                    <CloudOff className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      Non sincronizzato
                    </span>
                  </>
                )}
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRefresh}
                disabled={deviceInfo.isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${deviceInfo.isLoading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BatteryWidget 
            level={deviceInfo.batteryLevel}
            health={deviceInfo.batteryHealth}
            isCharging={deviceInfo.isCharging}
          />
          
          <StorageWidget 
            totalGb={deviceInfo.storageTotalGb}
            usedGb={deviceInfo.storageUsedGb}
            availableGb={deviceInfo.storageAvailableGb}
            percentUsed={deviceInfo.storagePercentUsed}
          />
          
          <RamWidget 
            totalMb={deviceInfo.ramTotalMb}
            availableMb={deviceInfo.ramAvailableMb}
            percentUsed={deviceInfo.ramPercentUsed}
          />
          
          <DeviceInfoWidget 
            model={deviceInfo.deviceModel}
            manufacturer={deviceInfo.deviceManufacturer}
            osVersion={deviceInfo.osVersion}
            platform={deviceInfo.platform}
            appVersion={deviceInfo.appVersion}
          />
        </div>

        {/* Error display */}
        {deviceInfo.error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{deviceInfo.error}</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom sync button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSync}
          disabled={syncing || !centroId}
        >
          {syncing ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Sincronizzazione...
            </>
          ) : (
            <>
              <Cloud className="h-5 w-5 mr-2" />
              Sincronizza con il Centro
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DeviceMonitor;
