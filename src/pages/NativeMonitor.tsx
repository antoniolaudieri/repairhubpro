import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Smartphone, 
  Battery, 
  HardDrive, 
  Wifi, 
  RefreshCw, 
  Upload, 
  LogOut,
  CheckCircle2,
  CreditCard,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import { useNativeDeviceInfo } from "@/hooks/useNativeDeviceInfo";

interface LoyaltyCard {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string;
}

interface NativeMonitorProps {
  user: User;
}

const NativeMonitor = ({ user }: NativeMonitorProps) => {
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Use native device info hook (better for Capacitor apps)
  const deviceData = useNativeDeviceInfo();

  // Fetch active loyalty card - search across all customers with this email
  const fetchLoyaltyCard = useCallback(async () => {
    try {
      // Find all customers with this email
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email);

      if (!customers || customers.length === 0) {
        setLoyaltyCard(null);
        setLoading(false);
        return;
      }

      // Get customer IDs
      const customerIds = customers.map(c => c.id);

      // Find active loyalty card for any of these customers
      const { data, error } = await supabase
        .from("loyalty_cards")
        .select("id, centro_id, status, customer_id")
        .in("customer_id", customerIds)
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching loyalty card:", error);
        setLoyaltyCard(null);
      } else {
        setLoyaltyCard(data);
      }
    } catch (err) {
      console.error("Error:", err);
      setLoyaltyCard(null);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchLoyaltyCard();
  }, [fetchLoyaltyCard]);

  const handleSync = async () => {
    if (!loyaltyCard) {
      toast.error("Nessuna tessera fedeltà attiva");
      return;
    }

    if (deviceData.isLoading) {
      toast.error("Dati dispositivo non disponibili");
      return;
    }

    setSyncing(true);
    try {
      // Save to device_health_logs (the table that CentroClienteDetail reads from)
      const { error: insertError } = await supabase
        .from("device_health_logs")
        .insert({
          centro_id: loyaltyCard.centro_id,
          customer_id: loyaltyCard.customer_id,
          loyalty_card_id: loyaltyCard.id,
          source: "android_native",
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
          device_model_info: deviceData.deviceModel,
          os_version: deviceData.osVersion,
          network_type: deviceData.networkType,
          network_connected: deviceData.networkConnected,
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
          longitude: deviceData.longitude,
          health_score: deviceData.healthScore,
          connection_downlink: deviceData.connectionDownlink,
          connection_effective_type: deviceData.connectionEffectiveType,
          connection_rtt: deviceData.connectionRtt,
        });

      if (insertError) {
        throw insertError;
      }

      toast.success("Dati sincronizzati con successo!");
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No active loyalty card
  if (!loyaltyCard) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Tessera Non Attiva</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Non hai una tessera fedeltà attiva associata a questo account.
                Contatta il tuo centro assistenza per attivarne una.
              </p>
              <p className="text-sm text-muted-foreground">
                Email: {user.email}
              </p>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6" />
            <div>
              <h1 className="font-semibold">Device Monitor</h1>
              <p className="text-xs opacity-80">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Loyalty Card Status */}
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Tessera Attiva
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                ID: {loyaltyCard.id.slice(0, 8)}...
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Health Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Stato Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className={`text-5xl font-bold ${
                deviceData.healthScore >= 80 ? 'text-green-500' :
                deviceData.healthScore >= 60 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {deviceData.healthScore}
              </div>
              <span className="text-2xl text-muted-foreground ml-1">/100</span>
            </div>
            {deviceData.deviceModel && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                {deviceData.deviceModel}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Device Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Battery */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Battery className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Batteria</span>
              </div>
              <p className="text-2xl font-bold">
                {deviceData.batteryLevel !== null 
                  ? `${Math.round(deviceData.batteryLevel)}%` 
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceData.isCharging ? 'In carica' : 'Non in carica'}
              </p>
            </CardContent>
          </Card>

          {/* Storage */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memoria</span>
              </div>
              <p className="text-2xl font-bold">
                {deviceData.storagePercentUsed !== null 
                  ? `${Math.round(deviceData.storagePercentUsed)}%` 
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceData.storageAvailableGb !== null 
                  ? `${deviceData.storageAvailableGb.toFixed(1)} GB liberi` 
                  : '--'}
              </p>
            </CardContent>
          </Card>

          {/* Network */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rete</span>
              </div>
              <p className="text-lg font-bold">
                {deviceData.networkConnected ? 'Connesso' : 'Offline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceData.networkType || deviceData.connectionEffectiveType || '--'}
              </p>
            </CardContent>
          </Card>

          {/* RAM / CPU */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Hardware</span>
              </div>
              <p className="text-lg font-bold">
                {deviceData.deviceMemoryGb !== null 
                  ? `${deviceData.deviceMemoryGb} GB RAM` 
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceData.cpuCores !== null 
                  ? `${deviceData.cpuCores} core` 
                  : '--'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Device Details */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dettagli Dispositivo</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modello:</span>
                <span className="font-medium">{deviceData.deviceModel || '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sistema:</span>
                <span className="font-medium">{deviceData.platform} {deviceData.osVersion || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schermo:</span>
                <span className="font-medium">
                  {deviceData.screenWidth && deviceData.screenHeight 
                    ? `${deviceData.screenWidth}x${deviceData.screenHeight}` 
                    : '--'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Sync Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button 
          className="w-full h-14 text-lg"
          onClick={handleSync}
          disabled={syncing || deviceData.isLoading}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Sincronizzazione...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Sincronizza con Centro
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NativeMonitor;
