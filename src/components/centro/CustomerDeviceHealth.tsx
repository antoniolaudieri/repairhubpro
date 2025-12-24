import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceHealthScore, DeviceHealthSummary, DeviceMetricCard } from "@/components/health/DeviceHealthScore";
import { motion } from "framer-motion";
import { 
  Activity, Battery, HardDrive, Cpu, Clock, AlertTriangle, 
  CheckCircle2, Sparkles, ChevronRight, RefreshCw, Loader2,
  Smartphone, FileText, Wifi, WifiOff, MemoryStick, Monitor,
  Plus, Save, Image, Package
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerDeviceHealthProps {
  customerId: string;
  centroId: string;
  onDeviceCreated?: () => void;
}

interface InstalledApp {
  packageName: string;
  appName: string | null;
  totalSizeMb: number;
  appSizeMb: number;
  dataSizeMb: number;
  cacheSizeMb: number;
  isSystemApp: boolean;
  totalTimeMinutes?: number;
  lastTimeUsed?: number;
}

interface HealthLog {
  id: string;
  health_score: number | null;
  battery_level: number | null;
  battery_health: string | null;
  battery_cycles: number | null;
  storage_percent_used: number | null;
  storage_available_gb: number | null;
  storage_total_gb: number | null;
  storage_used_gb: number | null;
  ram_percent_used: number | null;
  ram_available_mb: number | null;
  ram_total_mb: number | null;
  device_model_info: string | null;
  device_manufacturer: string | null;
  os_version: string | null;
  source: string;
  created_at: string;
  anomalies: any;
  network_type: string | null;
  network_connected: boolean | null;
  cpu_cores: number | null;
  screen_width: number | null;
  screen_height: number | null;
  is_charging: boolean | null;
  device_id: string | null;
  installed_apps: InstalledApp[] | null;
}

interface HardwareInfo {
  model?: string;
  platform?: string;
  battery?: { level?: number; charging?: boolean };
  storage?: { usedPercent?: number; availableGB?: number; totalGB?: number };
  ram?: { usedPercent?: number };
  network?: { type?: string };
  screen?: { width?: number; height?: number };
  cpu?: { cores?: number };
}

interface DiagnosticQuiz {
  id: string;
  health_score: number | null;
  ai_analysis: string | null;
  recommendations: any;
  status: string;
  created_at: string;
  hardware_info: HardwareInfo | null;
}

interface HealthAlert {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  alert_type: string;
  created_at: string;
  customer_response: string | null;
}

export function CustomerDeviceHealth({ customerId, centroId, onDeviceCreated }: CustomerDeviceHealthProps) {
  const [loading, setLoading] = useState(true);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [quizzes, setQuizzes] = useState<DiagnosticQuiz[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [selectedLog, setSelectedLog] = useState<HealthLog | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<DiagnosticQuiz | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deviceToSave, setDeviceToSave] = useState<{
    brand: string;
    model: string;
    device_type: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [customerId, centroId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch health logs with more fields
      const { data: logsData } = await supabase
        .from("device_health_logs")
        .select("*")
        .eq("customer_id", customerId)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false })
        .limit(20);

      const mappedLogs: HealthLog[] = (logsData || []).map(log => ({
        ...log,
        installed_apps: Array.isArray(log.installed_apps) ? log.installed_apps as unknown as InstalledApp[] : null
      }));
      setHealthLogs(mappedLogs);
      if (mappedLogs.length > 0) {
        setSelectedLog(mappedLogs[0]);
      }

      // Fetch diagnostic quizzes
      const { data: quizzesData } = await supabase
        .from("diagnostic_quizzes")
        .select("id, health_score, ai_analysis, recommendations, status, created_at, hardware_info")
        .eq("customer_id", customerId)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false })
        .limit(10);

      const mappedQuizzes: DiagnosticQuiz[] = (quizzesData || []).map(q => ({
        ...q,
        hardware_info: q.hardware_info as HardwareInfo | null
      }));
      
      setQuizzes(mappedQuizzes);
      if (mappedQuizzes.length > 0 && !logsData?.length) {
        setSelectedQuiz(mappedQuizzes[0]);
      }

      // Fetch alerts
      const { data: alertsData } = await supabase
        .from("device_health_alerts")
        .select("*")
        .eq("customer_id", customerId)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false })
        .limit(10);

      setAlerts(alertsData || []);
    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openSaveDeviceDialog = (log: HealthLog) => {
    // Extract brand and model from device info
    const manufacturer = log.device_manufacturer || "Android";
    const model = log.device_model_info || "Smartphone";
    
    setDeviceToSave({
      brand: manufacturer,
      model: model,
      device_type: "smartphone"
    });
    setSaveDialogOpen(true);
  };

  const saveDeviceToCustomer = async () => {
    if (!deviceToSave || !selectedLog) return;
    
    setSaving(true);
    try {
      // Create device linked to customer
      const { data: newDevice, error } = await supabase
        .from("devices")
        .insert({
          customer_id: customerId,
          device_type: deviceToSave.device_type,
          brand: deviceToSave.brand,
          model: deviceToSave.model,
          reported_issue: "Monitoraggio salute dispositivo"
        })
        .select()
        .single();

      if (error) throw error;

      // Update the health log with the device_id
      if (newDevice) {
        await supabase
          .from("device_health_logs")
          .update({ device_id: newDevice.id })
          .eq("id", selectedLog.id);
      }

      toast.success("Dispositivo salvato!", {
        description: `${deviceToSave.brand} ${deviceToSave.model} aggiunto al cliente`
      });
      
      setSaveDialogOpen(false);
      onDeviceCreated?.();
      fetchData();
    } catch (error: any) {
      toast.error("Errore nel salvataggio", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getBatteryHealthLabel = (health: string | null) => {
    if (!health) return { label: "Sconosciuto", color: "text-muted-foreground" };
    const healthMap: Record<string, { label: string; color: string }> = {
      good: { label: "Buona", color: "text-green-500" },
      dead: { label: "Critica", color: "text-red-500" },
      overheat: { label: "Surriscaldamento", color: "text-orange-500" },
      over_voltage: { label: "Sovratensione", color: "text-red-400" },
      cold: { label: "Fredda", color: "text-blue-400" },
      unspecified_failure: { label: "Errore", color: "text-yellow-500" }
    };
    return healthMap[health] || { label: health, color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = healthLogs.length > 0 || quizzes.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Salute Dispositivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nessun dato di salute disponibile</p>
            <p className="text-xs mt-1">
              Il cliente può effettuare diagnosi tramite l'app o il quiz iOS
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestScore = selectedLog?.health_score || selectedQuiz?.health_score || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Salute Dispositivo
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} className="h-8">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue={healthLogs.length > 0 ? "android" : "quiz"} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="android" className="flex-1" disabled={healthLogs.length === 0}>
                <Smartphone className="h-3.5 w-3.5 mr-1" />
                Android
                {healthLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {healthLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex-1" disabled={quizzes.length === 0}>
                <FileText className="h-3.5 w-3.5 mr-1" />
                iOS Quiz
                {quizzes.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                    {quizzes.length}
                  </Badge>
                )}
              </TabsTrigger>
              {alerts.length > 0 && (
                <TabsTrigger value="alerts" className="flex-1">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  Alert
                  <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                    {alerts.filter(a => a.status === "pending").length}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="android" className="mt-4 space-y-4">
              {selectedLog && (
                <>
                  {/* Device Info Card - Enhanced */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                    <div className="flex items-start gap-4">
                      {/* Device Icon/Image */}
                      <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                        <Smartphone className="h-8 w-8 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base">
                              {selectedLog.device_manufacturer || "Android"} {selectedLog.device_model_info || "Smartphone"}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {selectedLog.os_version ? `Android ${selectedLog.os_version}` : "Android"}
                            </p>
                          </div>
                          <DeviceHealthScore 
                            score={selectedLog.health_score || 0} 
                            size="sm" 
                          />
                        </div>
                        
                        {/* Screen & Hardware Info */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedLog.screen_width && selectedLog.screen_height && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 text-xs">
                              <Monitor className="h-3 w-3 text-blue-400" />
                              <span>{selectedLog.screen_width}x{selectedLog.screen_height}</span>
                            </div>
                          )}
                          {selectedLog.cpu_cores && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 text-xs">
                              <Cpu className="h-3 w-3 text-purple-400" />
                              <span>{selectedLog.cpu_cores} core</span>
                            </div>
                          )}
                          {selectedLog.ram_total_mb && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/60 text-xs">
                              <MemoryStick className="h-3 w-3 text-cyan-400" />
                              <span>{(selectedLog.ram_total_mb / 1024).toFixed(1)} GB RAM</span>
                            </div>
                          )}
                        </div>

                        {/* Save device button if not already linked */}
                        {!selectedLog.device_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 h-7 text-xs"
                            onClick={() => openSaveDeviceDialog(selectedLog)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Salva come Dispositivo Cliente
                          </Button>
                        )}
                        {selectedLog.device_id && (
                          <Badge variant="outline" className="mt-3 text-xs bg-accent/10 text-accent border-accent/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Dispositivo collegato
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid - Battery, Storage, RAM, Network */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Battery */}
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          (selectedLog.battery_level || 0) > 50 ? "bg-green-500/10" : 
                          (selectedLog.battery_level || 0) > 20 ? "bg-yellow-500/10" : "bg-red-500/10"
                        }`}>
                          <Battery className={`h-4 w-4 ${
                            (selectedLog.battery_level || 0) > 50 ? "text-green-500" : 
                            (selectedLog.battery_level || 0) > 20 ? "text-yellow-500" : "text-red-500"
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Batteria</p>
                          <p className="text-lg font-bold">{selectedLog.battery_level || 0}%</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {selectedLog.battery_health && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Salute</span>
                            <span className={getBatteryHealthLabel(selectedLog.battery_health).color}>
                              {getBatteryHealthLabel(selectedLog.battery_health).label}
                            </span>
                          </div>
                        )}
                        {selectedLog.is_charging !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Carica</span>
                            <span>{selectedLog.is_charging ? "⚡ In carica" : "Non in carica"}</span>
                          </div>
                        )}
                        {selectedLog.battery_cycles !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Cicli</span>
                            <span>{selectedLog.battery_cycles}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Storage */}
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          (selectedLog.storage_percent_used || 0) < 80 ? "bg-blue-500/10" : "bg-orange-500/10"
                        }`}>
                          <HardDrive className={`h-4 w-4 ${
                            (selectedLog.storage_percent_used || 0) < 80 ? "text-blue-500" : "text-orange-500"
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Storage</p>
                          <p className="text-lg font-bold">{Math.round(selectedLog.storage_percent_used || 0)}%</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {selectedLog.storage_available_gb !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Libero</span>
                            <span>{selectedLog.storage_available_gb.toFixed(1)} GB</span>
                          </div>
                        )}
                        {selectedLog.storage_total_gb !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Totale</span>
                            <span>{selectedLog.storage_total_gb.toFixed(0)} GB</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Installed Apps */}
                      {selectedLog.installed_apps && selectedLog.installed_apps.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Top {selectedLog.installed_apps.length} App per dimensione
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {selectedLog.installed_apps.slice(0, 10).map((app, idx) => (
                              <div key={app.packageName || idx} className="p-2 rounded-lg bg-muted/30 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                                      <Package className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <span className="text-xs font-medium truncate">{app.appName || app.packageName.split('.').pop()}</span>
                                    {app.isSystemApp && (
                                      <Badge variant="outline" className="text-[8px] h-3 px-1">SYS</Badge>
                                    )}
                                  </div>
                                  <span className={`text-xs shrink-0 ${app.totalSizeMb > 500 ? 'text-orange-500 font-medium' : ''}`}>
                                    {app.totalSizeMb >= 1024 
                                      ? `${(app.totalSizeMb / 1024).toFixed(1)} GB`
                                      : `${app.totalSizeMb.toFixed(0)} MB`
                                    }
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-7">
                                  <div className="flex items-center gap-3">
                                    <span>
                                      Utilizzo: {app.totalTimeMinutes && app.totalTimeMinutes > 0 
                                        ? app.totalTimeMinutes >= 60 
                                          ? `${Math.floor(app.totalTimeMinutes / 60)}h ${app.totalTimeMinutes % 60}min`
                                          : `${app.totalTimeMinutes} min`
                                        : 'Mai usata'}
                                    </span>
                                    <span>
                                      Dati: {app.dataSizeMb > 0 ? `${app.dataSizeMb.toFixed(0)} MB` : '0 MB'}
                                    </span>
                                  </div>
                                  {app.cacheSizeMb > 10 && (
                                    <span className="text-amber-500">
                                      Cache: {app.cacheSizeMb.toFixed(0)}MB
                                    </span>
                                  )}
                                </div>
                                {app.lastTimeUsed && app.lastTimeUsed > 0 && (
                                  <div className="text-[10px] text-muted-foreground pl-7">
                                    Ultimo uso: {new Date(app.lastTimeUsed).toLocaleDateString('it-IT', { 
                                      day: 'numeric', 
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {selectedLog.installed_apps.length > 10 && (
                            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                              +{selectedLog.installed_apps.length - 10} altre app
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* RAM */}
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          (selectedLog.ram_percent_used || 0) < 80 ? "bg-purple-500/10" : "bg-red-500/10"
                        }`}>
                          <MemoryStick className={`h-4 w-4 ${
                            (selectedLog.ram_percent_used || 0) < 80 ? "text-purple-500" : "text-red-500"
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">RAM</p>
                          <p className="text-lg font-bold">{Math.round(selectedLog.ram_percent_used || 0)}%</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {selectedLog.ram_available_mb !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Libera</span>
                            <span>{(selectedLog.ram_available_mb / 1024).toFixed(1)} GB</span>
                          </div>
                        )}
                        {selectedLog.ram_total_mb !== null && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Totale</span>
                            <span>{(selectedLog.ram_total_mb / 1024).toFixed(1)} GB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Network */}
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          selectedLog.network_connected ? "bg-green-500/10" : "bg-gray-500/10"
                        }`}>
                          {selectedLog.network_connected ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Rete</p>
                          <p className="text-lg font-bold">
                            {selectedLog.network_connected ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {selectedLog.network_type && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Tipo</span>
                            <span className="uppercase">{selectedLog.network_type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Last Sync Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ultimo sync: {format(new Date(selectedLog.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedLog.source === "android_native" ? "App Android" : selectedLog.source}
                    </Badge>
                  </div>

                  {/* Anomalies */}
                  {selectedLog?.anomalies && Object.keys(selectedLog.anomalies).length > 0 && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        <span className="text-sm font-medium text-warning">Anomalie Rilevate</span>
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {Object.entries(selectedLog.anomalies).map(([key, value]) => (
                          <li key={key} className="flex items-center gap-1">
                            <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                            <span>{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* History */}
              {healthLogs.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Storico Letture</h4>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {healthLogs.map((log) => (
                      <motion.button
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`flex-shrink-0 p-2 rounded-lg border text-center transition-colors ${
                          selectedLog?.id === log.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <DeviceHealthScore 
                          score={log.health_score || 0} 
                          size="sm" 
                          showLabel={false}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.created_at), "dd/MM", { locale: it })}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-4 space-y-4">
              {selectedQuiz ? (
                <div className="space-y-4">
                  {/* Detected Device Model - Mobile Optimized */}
                  {selectedQuiz.hardware_info?.model && (
                    <div className="p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">{selectedQuiz.hardware_info.model}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {selectedQuiz.hardware_info.platform || 'Dispositivo'}
                            {selectedQuiz.hardware_info.screen && ` • ${selectedQuiz.hardware_info.screen.width}x${selectedQuiz.hardware_info.screen.height}`}
                          </p>
                        </div>
                      </div>
                      {/* Hardware metrics - responsive grid */}
                      {(selectedQuiz.hardware_info.battery?.level !== undefined || 
                        selectedQuiz.hardware_info.storage?.usedPercent !== undefined || 
                        selectedQuiz.hardware_info.cpu?.cores) && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                          {selectedQuiz.hardware_info.battery?.level !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 text-xs">
                              <Battery className="h-3 w-3 text-green-500 shrink-0" />
                              <span className="font-medium">{selectedQuiz.hardware_info.battery.level}%</span>
                            </div>
                          )}
                          {selectedQuiz.hardware_info.storage?.usedPercent !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 text-xs">
                              <HardDrive className="h-3 w-3 text-blue-500 shrink-0" />
                              <span className="font-medium">{Math.round(selectedQuiz.hardware_info.storage.usedPercent)}%</span>
                            </div>
                          )}
                          {selectedQuiz.hardware_info.cpu?.cores && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/50 text-xs">
                              <Cpu className="h-3 w-3 text-purple-500 shrink-0" />
                              <span className="font-medium">{selectedQuiz.hardware_info.cpu.cores} core</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <DeviceHealthScore score={selectedQuiz.health_score || 0} size="md" />
                    <div>
                      <p className="text-sm font-medium">Quiz Diagnostico</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedQuiz.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                      </p>
                      <Badge 
                        variant={selectedQuiz.status === "analyzed" ? "default" : "secondary"}
                        className="mt-1"
                      >
                        {selectedQuiz.status === "analyzed" ? "Analizzato" : "In attesa"}
                      </Badge>
                    </div>
                  </div>

                  {selectedQuiz.ai_analysis && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Analisi AI</span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {selectedQuiz.ai_analysis}
                      </p>
                    </div>
                  )}

                  {selectedQuiz.recommendations && Array.isArray(selectedQuiz.recommendations) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground">Raccomandazioni</h4>
                      <ul className="space-y-1">
                        {selectedQuiz.recommendations.map((rec: any, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                            <span>{typeof rec === 'string' ? rec : rec.text || rec.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun quiz completato
                </p>
              )}

              {/* Quiz History */}
              {quizzes.length > 1 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Storico Quiz</h4>
                  <div className="space-y-2">
                    {quizzes.map((quiz) => (
                      <motion.button
                        key={quiz.id}
                        onClick={() => setSelectedQuiz(quiz)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectedQuiz?.id === quiz.id 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-center gap-3">
                          <DeviceHealthScore 
                            score={quiz.health_score || 0} 
                            size="sm" 
                            showLabel={false}
                          />
                          <div className="text-left">
                            <p className="text-sm font-medium">Punteggio: {quiz.health_score}/100</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(quiz.created_at), "dd MMM yyyy", { locale: it })}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="mt-4 space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.severity === "critical" 
                      ? "bg-destructive/5 border-destructive/20" 
                      : "bg-warning/5 border-warning/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                        alert.severity === "critical" ? "text-destructive" : "text-warning"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(alert.created_at), "dd MMM yyyy, HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={alert.status === "pending" ? "secondary" : "outline"}>
                      {alert.status === "pending" ? "In attesa" : 
                       alert.status === "sent" ? "Inviato" : 
                       alert.customer_response || alert.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Device Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salva Dispositivo</DialogTitle>
            <DialogDescription>
              Aggiungi questo dispositivo alla lista dispositivi del cliente per usarlo in preventivi e riparazioni.
            </DialogDescription>
          </DialogHeader>
          
          {deviceToSave && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input 
                  value={deviceToSave.brand} 
                  onChange={(e) => setDeviceToSave({ ...deviceToSave, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Modello</Label>
                <Input 
                  value={deviceToSave.model} 
                  onChange={(e) => setDeviceToSave({ ...deviceToSave, model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo Dispositivo</Label>
                <Input 
                  value={deviceToSave.device_type} 
                  onChange={(e) => setDeviceToSave({ ...deviceToSave, device_type: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={saveDeviceToCustomer} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva Dispositivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
