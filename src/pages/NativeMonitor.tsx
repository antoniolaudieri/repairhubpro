import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Cpu,
  Monitor,
  Globe,
  Thermometer,
  Signal,
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  MemoryStick,
  Languages,
  Gauge,
  Activity,
  Eye,
  Fingerprint,
  Volume2,
  Bluetooth,
  Camera,
  Vibrate,
  Sun,
  Moon,
  Compass
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

interface DiagnosticIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
}

const NativeMonitor = ({ user }: NativeMonitorProps) => {
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const deviceData = useNativeDeviceInfo();

  // Analyze device for issues
  const analyzeIssues = useCallback((): DiagnosticIssue[] => {
    const issues: DiagnosticIssue[] = [];
    
    // Battery issues
    if (deviceData.batteryLevel !== null) {
      if (deviceData.batteryLevel < 10) {
        issues.push({
          severity: 'critical',
          title: 'Batteria Critica',
          description: `Livello batteria molto basso (${deviceData.batteryLevel}%). Collegare immediatamente il caricatore.`,
          icon: <Battery className="h-4 w-4" />
        });
      } else if (deviceData.batteryLevel < 20) {
        issues.push({
          severity: 'warning',
          title: 'Batteria Bassa',
          description: `Livello batteria basso (${deviceData.batteryLevel}%). Si consiglia di ricaricare.`,
          icon: <Battery className="h-4 w-4" />
        });
      }
    }
    
    // Storage issues
    if (deviceData.storagePercentUsed !== null) {
      if (deviceData.storagePercentUsed > 95) {
        issues.push({
          severity: 'critical',
          title: 'Memoria Piena',
          description: `Spazio di archiviazione quasi esaurito (${deviceData.storagePercentUsed}%). Liberare spazio urgentemente.`,
          icon: <HardDrive className="h-4 w-4" />
        });
      } else if (deviceData.storagePercentUsed > 85) {
        issues.push({
          severity: 'warning',
          title: 'Memoria Quasi Piena',
          description: `Lo spazio di archiviazione sta terminando (${deviceData.storagePercentUsed}%). Si consiglia di liberare spazio.`,
          icon: <HardDrive className="h-4 w-4" />
        });
      }
    }
    
    // RAM issues
    if (deviceData.ramPercentUsed !== null) {
      if (deviceData.ramPercentUsed > 90) {
        issues.push({
          severity: 'warning',
          title: 'RAM Sotto Pressione',
          description: `Memoria RAM quasi esaurita (${deviceData.ramPercentUsed}%). Le app potrebbero rallentare.`,
          icon: <MemoryStick className="h-4 w-4" />
        });
      }
    }
    
    // Network issues
    if (!deviceData.networkConnected) {
      issues.push({
        severity: 'critical',
        title: 'Nessuna Connessione',
        description: 'Il dispositivo non è connesso a internet.',
        icon: <Wifi className="h-4 w-4" />
      });
    } else if (deviceData.connectionEffectiveType === 'slow-2g' || deviceData.connectionEffectiveType === '2g') {
      issues.push({
        severity: 'warning',
        title: 'Connessione Lenta',
        description: `Velocità di connessione molto bassa (${deviceData.connectionEffectiveType}). Potrebbero verificarsi ritardi.`,
        icon: <Signal className="h-4 w-4" />
      });
    }
    
    // Connection latency
    if (deviceData.connectionRtt !== null && deviceData.connectionRtt > 500) {
      issues.push({
        severity: 'warning',
        title: 'Latenza Elevata',
        description: `Tempo di risposta elevato (${deviceData.connectionRtt}ms). La connessione potrebbe essere instabile.`,
        icon: <Activity className="h-4 w-4" />
      });
    }
    
    // Low device memory
    if (deviceData.deviceMemoryGb !== null && deviceData.deviceMemoryGb < 2) {
      issues.push({
        severity: 'info',
        title: 'RAM Limitata',
        description: `Dispositivo con RAM limitata (${deviceData.deviceMemoryGb}GB). Alcune app potrebbero non funzionare bene.`,
        icon: <Cpu className="h-4 w-4" />
      });
    }
    
    // Low CPU cores
    if (deviceData.cpuCores !== null && deviceData.cpuCores < 4) {
      issues.push({
        severity: 'info',
        title: 'CPU Base',
        description: `Processore con ${deviceData.cpuCores} core. Prestazioni base per app impegnative.`,
        icon: <Cpu className="h-4 w-4" />
      });
    }
    
    return issues;
  }, [deviceData]);

  const issues = analyzeIssues();
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  // Fetch active loyalty card
  const fetchLoyaltyCard = useCallback(async () => {
    try {
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email);

      if (!customers || customers.length === 0) {
        setLoyaltyCard(null);
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

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
          device_manufacturer: deviceData.deviceManufacturer,
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

      if (insertError) throw insertError;
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

  const handleRefresh = async () => {
    await deviceData.refresh?.();
    toast.success("Dati aggiornati");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
              </p>
              <p className="text-sm text-muted-foreground">Email: {user.email}</p>
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

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6" />
            <div>
              <h1 className="font-semibold">Device Health Monitor</h1>
              <p className="text-xs opacity-80 truncate max-w-[180px]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className={`h-5 w-5 ${deviceData.isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Health Score Banner */}
      <div className="p-4">
        <Card className="overflow-hidden">
          <div className={`h-2 ${getHealthBg(deviceData.healthScore)}`} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stato Salute Dispositivo</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${getHealthColor(deviceData.healthScore)}`}>
                    {deviceData.healthScore}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceData.deviceModel || 'Dispositivo'}
                </p>
              </div>
              <div className="text-right">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Tutto OK</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalCount} Critici
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge className="bg-yellow-500 text-xs ml-1">
                        {warningCount} Avvisi
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Panoramica</TabsTrigger>
          <TabsTrigger value="hardware" className="text-xs">Hardware</TabsTrigger>
          <TabsTrigger value="network" className="text-xs">Rete</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs">
            Problemi
            {issues.length > 0 && (
              <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {issues.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-340px)] mt-4">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 m-0">
            {/* Loyalty Card */}
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                    Tessera Fedeltà Attiva
                  </p>
                  <p className="text-xs text-green-600">ID: {loyaltyCard.id.slice(0, 8)}...</p>
                </div>
              </CardContent>
            </Card>

            {/* Battery Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Battery className={`h-5 w-5 ${deviceData.isCharging ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Batteria</span>
                  </div>
                  {deviceData.isCharging && (
                    <Badge variant="outline" className="text-green-600 border-green-500">
                      <Zap className="h-3 w-3 mr-1" />
                      In carica
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Livello</span>
                    <span className="font-medium">
                      {deviceData.batteryLevel !== null ? `${Math.round(deviceData.batteryLevel)}%` : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={deviceData.batteryLevel || 0} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stato: {deviceData.batteryHealth || 'Sconosciuto'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Memoria</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilizzata</span>
                    <span className="font-medium">
                      {deviceData.storagePercentUsed !== null ? `${Math.round(deviceData.storagePercentUsed)}%` : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={deviceData.storagePercentUsed || 0} 
                    className="h-2"
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {deviceData.storageTotalGb?.toFixed(1) || '--'} GB
                      </p>
                      <p>Totale</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {deviceData.storageUsedGb?.toFixed(1) || '--'} GB
                      </p>
                      <p>Usata</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {deviceData.storageAvailableGb?.toFixed(1) || '--'} GB
                      </p>
                      <p>Libera</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RAM Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">RAM</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilizzata</span>
                    <span className="font-medium">
                      {deviceData.ramPercentUsed !== null ? `${Math.round(deviceData.ramPercentUsed)}%` : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={deviceData.ramPercentUsed || 0} 
                    className="h-2"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {deviceData.ramTotalMb ? (deviceData.ramTotalMb / 1024).toFixed(1) : '--'} GB
                      </p>
                      <p>Totale</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {deviceData.ramAvailableMb ? (deviceData.ramAvailableMb / 1024).toFixed(1) : '--'} GB
                      </p>
                      <p>Disponibile</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hardware Tab */}
          <TabsContent value="hardware" className="space-y-3 m-0">
            {/* Device Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Informazioni Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Modello</p>
                    <p className="font-medium">{deviceData.deviceModel || '--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Produttore</p>
                    <p className="font-medium">{deviceData.deviceManufacturer || '--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sistema Operativo</p>
                    <p className="font-medium">{deviceData.platform} {deviceData.osVersion || ''}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Versione App</p>
                    <p className="font-medium">{deviceData.appVersion || '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CPU */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Processore
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Core CPU</p>
                    <p className="font-medium">{deviceData.cpuCores || '--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Concorrenza Hardware</p>
                    <p className="font-medium">{deviceData.hardwareConcurrency || '--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Memoria Dispositivo</p>
                    <p className="font-medium">
                      {deviceData.deviceMemoryGb ? `${deviceData.deviceMemoryGb} GB` : '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Screen */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Schermo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Risoluzione</p>
                    <p className="font-medium">
                      {deviceData.screenWidth && deviceData.screenHeight 
                        ? `${deviceData.screenWidth} x ${deviceData.screenHeight}` 
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Densità Pixel</p>
                    <p className="font-medium">
                      {deviceData.pixelRatio ? `${deviceData.pixelRatio}x` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Profondità Colore</p>
                    <p className="font-medium">
                      {deviceData.colorDepth ? `${deviceData.colorDepth} bit` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Orientamento</p>
                    <p className="font-medium capitalize">
                      {deviceData.orientation?.replace('-primary', '') || '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Touch */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Input Touch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Supporto Touch</p>
                    <p className="font-medium">
                      {deviceData.touchSupport ? 'Sì' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Punti Touch Max</p>
                    <p className="font-medium">{deviceData.maxTouchPoints || '--'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locale */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Localizzazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Lingua</p>
                    <p className="font-medium">{deviceData.language || '--'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Fuso Orario</p>
                    <p className="font-medium text-xs">{deviceData.timezone || '--'}</p>
                  </div>
                  {deviceData.latitude && deviceData.longitude && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs">Latitudine</p>
                        <p className="font-medium">{deviceData.latitude.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Longitudine</p>
                        <p className="font-medium">{deviceData.longitude.toFixed(4)}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-3 m-0">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Stato Connessione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    deviceData.networkConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {deviceData.networkConnected ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {deviceData.networkConnected ? 'Connesso' : 'Disconnesso'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {deviceData.networkType || 'Tipo sconosciuto'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Online</p>
                    <p className="font-medium">{deviceData.onlineStatus ? 'Sì' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tipo Connessione</p>
                    <p className="font-medium uppercase">
                      {deviceData.connectionEffectiveType || '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Quality */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Qualità Connessione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Velocità Download</p>
                    <p className="font-medium">
                      {deviceData.connectionDownlink !== null 
                        ? `${deviceData.connectionDownlink} Mbps` 
                        : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Latenza (RTT)</p>
                    <p className="font-medium">
                      {deviceData.connectionRtt !== null 
                        ? `${deviceData.connectionRtt} ms` 
                        : '--'}
                    </p>
                  </div>
                </div>
                
                {deviceData.connectionDownlink !== null && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Velocità</p>
                    <Progress 
                      value={Math.min((deviceData.connectionDownlink / 100) * 100, 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0</span>
                      <span>50 Mbps</span>
                      <span>100+</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Network Type Info */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p><strong>4G/LTE:</strong> Velocità ottima per streaming e download</p>
                  <p><strong>3G:</strong> Velocità accettabile per navigazione base</p>
                  <p><strong>2G:</strong> Velocità molto limitata, solo testo</p>
                  <p><strong>WiFi:</strong> Velocità variabile, dipende dalla rete</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-3 m-0">
            {issues.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-lg">Nessun Problema Rilevato</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Il tuo dispositivo sembra funzionare correttamente!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  {criticalCount > 0 && (
                    <Badge variant="destructive">{criticalCount} Critici</Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge className="bg-yellow-500">{warningCount} Avvisi</Badge>
                  )}
                  {issues.filter(i => i.severity === 'info').length > 0 && (
                    <Badge variant="secondary">
                      {issues.filter(i => i.severity === 'info').length} Info
                    </Badge>
                  )}
                </div>

                {issues.map((issue, index) => (
                  <Card key={index} className={`border ${getSeverityColor(issue.severity)}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        {getSeverityIcon(issue.severity)}
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{issue.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Fixed Sync Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <Button 
          className="w-full h-12"
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
