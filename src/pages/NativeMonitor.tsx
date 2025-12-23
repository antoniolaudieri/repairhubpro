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
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useDeviceInfo, DeviceInfo } from "@/hooks/useDeviceInfo";

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
  const deviceInfo = useDeviceInfo();

  // Fetch active loyalty card by finding customer first
  const fetchLoyaltyCard = useCallback(async () => {
    try {
      // First find the customer by email
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();

      if (!customer) {
        setLoyaltyCard(null);
        setLoading(false);
        return;
      }

      // Then find active loyalty card for this customer
      const { data, error } = await supabase
        .from("loyalty_cards")
        .select("id, centro_id, status, customer_id")
        .eq("customer_id", customer.id)
        .eq("status", "active")
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

  const calculateHealthScore = (info: DeviceInfo): number => {
    let score = 100;
    
    // Battery penalty
    if (info.battery?.level !== null) {
      if (info.battery.level < 20) score -= 20;
      else if (info.battery.level < 50) score -= 10;
    }
    
    // Storage penalty
    if (info.storage?.percentUsed !== null) {
      if (info.storage.percentUsed > 90) score -= 25;
      else if (info.storage.percentUsed > 80) score -= 15;
      else if (info.storage.percentUsed > 70) score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  };

  const handleSync = async () => {
    if (!loyaltyCard) {
      toast.error("Nessuna tessera fedeltà attiva");
      return;
    }

    if (deviceInfo.loading) {
      toast.error("Dati dispositivo non disponibili");
      return;
    }

    setSyncing(true);
    try {
      // Convert storage from bytes to GB
      const storageTotal = deviceInfo.storage?.total ? deviceInfo.storage.total / (1024 * 1024 * 1024) : null;
      const storageUsed = deviceInfo.storage?.used ? deviceInfo.storage.used / (1024 * 1024 * 1024) : null;
      const storageAvailable = deviceInfo.storage?.available ? deviceInfo.storage.available / (1024 * 1024 * 1024) : null;

      // Save device health reading
      const { error: insertError } = await supabase
        .from("device_health_readings")
        .insert({
          centro_id: loyaltyCard.centro_id,
          customer_id: loyaltyCard.customer_id,
          loyalty_card_id: loyaltyCard.id,
          battery_level: deviceInfo.battery?.level,
          is_charging: deviceInfo.battery?.charging,
          storage_total_gb: storageTotal,
          storage_used_gb: storageUsed,
          storage_available_gb: storageAvailable,
          storage_percent_used: deviceInfo.storage?.percentUsed,
          device_memory_gb: deviceInfo.memory?.deviceMemory,
          network_connected: deviceInfo.network?.effectiveType !== null,
          network_type: deviceInfo.network?.type,
          device_model: deviceInfo.model,
          device_manufacturer: deviceInfo.manufacturer,
          os_version: deviceInfo.osVersion,
          platform: deviceInfo.platform,
          screen_width: deviceInfo.screen?.width,
          screen_height: deviceInfo.screen?.height,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          health_score: calculateHealthScore(deviceInfo),
          cpu_cores: deviceInfo.cpu?.cores,
          hardware_concurrency: deviceInfo.cpu?.cores,
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

  const healthScore = calculateHealthScore(deviceInfo);

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
                healthScore >= 80 ? 'text-green-500' :
                healthScore >= 60 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {healthScore}
              </div>
              <span className="text-2xl text-muted-foreground ml-1">/100</span>
            </div>
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
                {deviceInfo.battery?.level !== null 
                  ? `${Math.round(deviceInfo.battery.level)}%` 
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceInfo.battery?.charging ? 'In carica' : 'Non in carica'}
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
                {deviceInfo.storage?.percentUsed !== null 
                  ? `${Math.round(deviceInfo.storage.percentUsed)}%` 
                  : '--'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceInfo.storage?.available !== null 
                  ? `${(deviceInfo.storage.available / (1024 * 1024 * 1024)).toFixed(1)} GB liberi` 
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
                {deviceInfo.network?.effectiveType ? 'Connesso' : 'Offline'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deviceInfo.network?.effectiveType || deviceInfo.network?.type || '--'}
              </p>
            </CardContent>
          </Card>

          {/* Device */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Dispositivo</span>
              </div>
              <p className="text-sm font-bold truncate">
                {deviceInfo.model || '--'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {deviceInfo.osVersion || '--'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Sync Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button 
          className="w-full h-14 text-lg"
          onClick={handleSync}
          disabled={syncing || deviceInfo.loading}
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
