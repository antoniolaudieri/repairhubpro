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
  Smartphone, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerDeviceHealthProps {
  customerId: string;
  centroId: string;
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
  ram_percent_used: number | null;
  ram_available_mb: number | null;
  device_model_info: string | null;
  os_version: string | null;
  source: string;
  created_at: string;
  anomalies: any;
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

export function CustomerDeviceHealth({ customerId, centroId }: CustomerDeviceHealthProps) {
  const [loading, setLoading] = useState(true);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [quizzes, setQuizzes] = useState<DiagnosticQuiz[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [selectedLog, setSelectedLog] = useState<HealthLog | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<DiagnosticQuiz | null>(null);

  useEffect(() => {
    fetchData();
  }, [customerId, centroId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch health logs
      const { data: logsData } = await supabase
        .from("device_health_logs")
        .select("*")
        .eq("customer_id", customerId)
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false })
        .limit(20);

      setHealthLogs(logsData || []);
      if (logsData && logsData.length > 0) {
        setSelectedLog(logsData[0]);
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
              <DeviceHealthSummary healthLog={selectedLog} />
            )}

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

            {/* History */}
            {healthLogs.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Storico</h4>
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
  );
}
