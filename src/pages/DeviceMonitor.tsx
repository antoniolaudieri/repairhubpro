import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, Bell, Cloud, CloudOff, Settings, LogIn, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNativeDeviceInfo } from '@/hooks/useNativeDeviceInfo';
import { useAuth } from '@/hooks/useAuth';
import { 
  BatteryWidget, 
  StorageWidget, 
  DeviceInfoWidget, 
  HealthScoreWidget,
  RamWidget,
  NetworkWidget,
  ScreenWidget,
  HardwareWidget,
  LocaleWidget
} from '@/components/monitor';

interface CentroInfo {
  id: string;
  business_name: string;
  logo_url: string | null;
}

interface LoyaltyCardInfo {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string | null;
}

const DeviceMonitor = () => {
  const { centroId: urlCentroId } = useParams<{ centroId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [centro, setCentro] = useState<CentroInfo | null>(null);
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [noLoyaltyCard, setNoLoyaltyCard] = useState(false);
  
  // Use centroId from URL or from loyalty card
  const centroId = urlCentroId || loyaltyCard?.centro_id;
  const customerId = loyaltyCard?.customer_id || undefined;
  
  const deviceInfo = useNativeDeviceInfo(centroId, customerId, loyaltyCard?.id);

  // Check if running in native environment and setup Capacitor
  useEffect(() => {
    let mounted = true;
    
    const initCapacitor = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const nativePlatform = Capacitor.isNativePlatform();
        if (!mounted) return;
        setIsNative(nativePlatform);
        
        if (nativePlatform) {
          // Setup push notifications
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            const result = await PushNotifications.checkPermissions();
            
            if (result.receive === 'prompt') {
              const requestResult = await PushNotifications.requestPermissions();
              if (mounted) setPushEnabled(requestResult.receive === 'granted');
            } else {
              if (mounted) setPushEnabled(result.receive === 'granted');
            }

            if (result.receive === 'granted') {
              await PushNotifications.register();
              
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
            console.log('Push notifications not available:', e);
          }

          // Setup app lifecycle
          try {
            const { App } = await import('@capacitor/app');
            App.addListener('appStateChange', async ({ isActive }) => {
              if (isActive) {
                deviceInfo.refresh();
              } else {
                await deviceInfo.syncToServer();
              }
            });
          } catch (e) {
            console.log('App lifecycle not available:', e);
          }
        }
      } catch (e) {
        console.log('Capacitor initialization error:', e);
        if (mounted) setIsNative(false);
      }
    };
    
    initCapacitor();
    
    return () => {
      mounted = false;
    };
  }, [toast, deviceInfo]);

  // Fetch loyalty card and centro info for logged-in user
  useEffect(() => {
    const fetchUserData = async () => {
      // Wait for auth to complete
      if (authLoading) return;
      
      // If no user and no URL centroId, need to show login
      if (!user && !urlCentroId) {
        setLoading(false);
        return;
      }
      
      try {
        // If we have urlCentroId, just fetch centro info
        if (urlCentroId) {
          const { data: centroData, error: centroError } = await supabase
            .from('centri_assistenza')
            .select('id, business_name, logo_url')
            .eq('id', urlCentroId)
            .maybeSingle();
          
          if (centroError) throw centroError;
          if (centroData) {
            setCentro(centroData);
          }
          setLoading(false);
          return;
        }
        
        // Get user email from JWT
        const userEmail = user?.email;
        if (!userEmail) {
          setLoading(false);
          return;
        }
        
        // First, find customer by email
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (customerError) {
          console.log('Error finding customer:', customerError);
        }
        
        const foundCustomerId = customerData?.id || null;

        // Fetch active loyalty card for this user
        const { data: cards, error: cardError } = await supabase
          .from('loyalty_cards')
          .select(`
            id,
            centro_id,
            status,
            customer_id,
            centri_assistenza (
              id,
              business_name,
              logo_url
            )
          `)
          .eq('status', 'active')
          .order('activated_at', { ascending: false })
          .limit(1);
        
        if (cardError) throw cardError;
        
        if (!cards || cards.length === 0) {
          setNoLoyaltyCard(true);
          setLoading(false);
          return;
        }
        
        const card = cards[0];
        setLoyaltyCard({
          id: card.id,
          centro_id: card.centro_id,
          status: card.status,
          customer_id: foundCustomerId || card.customer_id || null
        });
        
        // Set centro info from the joined data
        if (card.centri_assistenza) {
          const centroData = card.centri_assistenza as unknown as CentroInfo;
          setCentro(centroData);
        }
        
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare i dati',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, authLoading, urlCentroId, toast]);

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

  if (loading || authLoading) {
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

  // Not logged in - show login prompt
  if (!user && !urlCentroId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Accedi per continuare</h1>
            <p className="text-muted-foreground">
              Per monitorare il tuo dispositivo e sincronizzare i dati con il centro, devi accedere con il tuo account.
            </p>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate('/auth?redirect=/device-monitor')}
            >
              <LogIn className="h-5 w-5 mr-2" />
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in but no loyalty card
  if (noLoyaltyCard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <CreditCard className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold">Nessuna Tessera Attiva</h1>
            <p className="text-muted-foreground">
              Per utilizzare il monitoraggio del dispositivo, devi avere una tessera fedeltà attiva presso un centro assistenza.
            </p>
            <p className="text-sm text-muted-foreground">
              Contatta il tuo centro assistenza per attivare una tessera fedeltà.
            </p>
          </CardContent>
        </Card>
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
          
          <NetworkWidget
            networkType={deviceInfo.networkType}
            networkConnected={deviceInfo.networkConnected}
            connectionDownlink={deviceInfo.connectionDownlink}
            connectionEffectiveType={deviceInfo.connectionEffectiveType}
            connectionRtt={deviceInfo.connectionRtt}
            onlineStatus={deviceInfo.onlineStatus}
          />
          
          <ScreenWidget
            screenWidth={deviceInfo.screenWidth}
            screenHeight={deviceInfo.screenHeight}
            pixelRatio={deviceInfo.pixelRatio}
            colorDepth={deviceInfo.colorDepth}
            orientation={deviceInfo.orientation}
            touchSupport={deviceInfo.touchSupport}
          />
          
          <HardwareWidget
            cpuCores={deviceInfo.cpuCores}
            deviceMemoryGb={deviceInfo.deviceMemoryGb}
            hardwareConcurrency={deviceInfo.hardwareConcurrency}
            maxTouchPoints={deviceInfo.maxTouchPoints}
          />
          
          <LocaleWidget
            timezone={deviceInfo.timezone}
            language={deviceInfo.language}
            latitude={deviceInfo.latitude}
            longitude={deviceInfo.longitude}
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
