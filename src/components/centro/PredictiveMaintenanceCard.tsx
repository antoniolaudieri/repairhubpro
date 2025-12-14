import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  Battery, 
  Smartphone, 
  Plug, 
  HardDrive, 
  Wrench, 
  RefreshCw,
  Calendar,
  X,
  Euro,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Volume2,
  Camera,
  Thermometer,
  Loader2,
  History,
  Clock,
  XCircle,
  TrendingUp,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface MaintenancePrediction {
  id: string;
  device_id: string | null;
  customer_id: string;
  prediction_type: string;
  urgency: string;
  predicted_issue: string;
  confidence_score: number | null;
  reasoning: string | null;
  recommended_action: string | null;
  estimated_cost: number | null;
  due_date: string | null;
  status: string;
  created_at: string;
  completed_at?: string | null;
  dismissed_at?: string | null;
  dismiss_reason?: string | null;
}

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
}

interface PredictiveMaintenanceCardProps {
  customerId: string;
  centroId: string;
  devices: Device[];
  customerPhone?: string;
  onSchedule?: (prediction: MaintenancePrediction) => void;
}

const predictionTypeConfig: Record<string, { icon: React.ReactNode; label: string; gradient: string }> = {
  battery: { icon: <Battery className="h-4 w-4" />, label: "Batteria", gradient: "from-amber-500 to-orange-500" },
  screen: { icon: <Smartphone className="h-4 w-4" />, label: "Schermo", gradient: "from-blue-500 to-cyan-500" },
  charging_port: { icon: <Plug className="h-4 w-4" />, label: "Porta Ricarica", gradient: "from-green-500 to-emerald-500" },
  storage: { icon: <HardDrive className="h-4 w-4" />, label: "Storage", gradient: "from-purple-500 to-violet-500" },
  general_checkup: { icon: <Wrench className="h-4 w-4" />, label: "Check-up", gradient: "from-slate-500 to-zinc-500" },
  software: { icon: <Zap className="h-4 w-4" />, label: "Software", gradient: "from-indigo-500 to-blue-500" },
  speaker: { icon: <Volume2 className="h-4 w-4" />, label: "Audio", gradient: "from-pink-500 to-rose-500" },
  camera: { icon: <Camera className="h-4 w-4" />, label: "Fotocamera", gradient: "from-teal-500 to-cyan-500" },
  thermal: { icon: <Thermometer className="h-4 w-4" />, label: "Raffreddamento", gradient: "from-red-500 to-orange-500" },
};

const urgencyConfig: Record<string, { color: string; bgColor: string; label: string; ringColor: string }> = {
  low: { color: "text-emerald-600", bgColor: "bg-emerald-500/10", label: "Bassa", ringColor: "ring-emerald-500/30" },
  medium: { color: "text-amber-600", bgColor: "bg-amber-500/10", label: "Media", ringColor: "ring-amber-500/30" },
  high: { color: "text-red-600", bgColor: "bg-red-500/10", label: "Alta", ringColor: "ring-red-500/30" },
};

export function PredictiveMaintenanceCard({ 
  customerId, 
  centroId, 
  devices,
  customerPhone,
  onSchedule 
}: PredictiveMaintenanceCardProps) {
  const [activePredictions, setActivePredictions] = useState<MaintenancePrediction[]>([]);
  const [historyPredictions, setHistoryPredictions] = useState<MaintenancePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<MaintenancePrediction | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const loadPredictions = async () => {
    try {
      // Load active predictions
      const { data: active, error: activeError } = await supabase
        .from("maintenance_predictions")
        .select("*")
        .eq("customer_id", customerId)
        .in("status", ["pending", "notified", "scheduled"])
        .order("urgency", { ascending: false })
        .order("due_date", { ascending: true });

      if (activeError) throw activeError;
      setActivePredictions(active || []);

      // Load history (completed + dismissed)
      const { data: history, error: historyError } = await supabase
        .from("maintenance_predictions")
        .select("*")
        .eq("customer_id", customerId)
        .in("status", ["completed", "dismissed"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyError) throw historyError;
      setHistoryPredictions(history || []);
    } catch (error: any) {
      console.error("Error loading predictions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [customerId]);

  const generatePredictions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-maintenance-predictions", {
        body: { 
          customer_id: customerId, 
          centro_id: centroId,
          mode: "customer" 
        },
      });

      if (error) throw error;

      const count = data.predictions?.length || 0;
      if (count > 0) {
        toast.success(`${count} suggerimenti di manutenzione generati`);
      } else {
        toast.info("Nessun nuovo suggerimento rilevato");
      }
      await loadPredictions();
    } catch (error: any) {
      toast.error("Errore nell'analisi AI");
      console.error("Error generating predictions:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedPrediction) return;

    try {
      const { error } = await supabase
        .from("maintenance_predictions")
        .update({
          status: "dismissed",
          dismissed_at: new Date().toISOString(),
          dismiss_reason: dismissReason || null,
        })
        .eq("id", selectedPrediction.id);

      if (error) throw error;

      toast.success("Suggerimento ignorato");
      setDismissDialogOpen(false);
      setSelectedPrediction(null);
      setDismissReason("");
      await loadPredictions();
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleComplete = async (prediction: MaintenancePrediction) => {
    try {
      const { error } = await supabase
        .from("maintenance_predictions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", prediction.id);

      if (error) throw error;
      toast.success("Manutenzione completata!");
      await loadPredictions();
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleContact = (prediction: MaintenancePrediction) => {
    const device = devices.find(d => d.id === prediction.device_id);
    const deviceName = device ? `${device.brand} ${device.model}` : "dispositivo";
    
    const message = encodeURIComponent(
      `Salve! Dall'analisi del suo ${deviceName}, abbiamo rilevato che potrebbe essere necessaria una manutenzione preventiva: ${prediction.predicted_issue}. ` +
      `Le consigliamo: ${prediction.recommended_action}. ` +
      `Costo stimato: €${prediction.estimated_cost || 0}. Ci contatti per un appuntamento!`
    );
    
    if (customerPhone) {
      const phone = customerPhone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone.startsWith("39") ? phone : "39" + phone}?text=${message}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  const getDeviceForPrediction = (deviceId: string | null) => {
    if (!deviceId) return null;
    return devices.find(d => d.id === deviceId);
  };

  // Stats
  const highUrgencyCount = activePredictions.filter(p => p.urgency === "high").length;
  const mediumUrgencyCount = activePredictions.filter(p => p.urgency === "medium").length;
  const completedCount = historyPredictions.filter(p => p.status === "completed").length;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Manutenzione Predittiva AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card via-card to-primary/5">
        {/* Header with gradient accent */}
        <div className="h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Manutenzione Predittiva</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {activePredictions.length} suggerimenti attivi
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generatePredictions}
              disabled={generating || devices.length === 0}
              className="gap-1.5 h-9 shadow-sm"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {generating ? "Analisi..." : "Analizza"}
            </Button>
          </div>

          {/* Quick Stats */}
          {activePredictions.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              {highUrgencyCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {highUrgencyCount} urgenti
                </Badge>
              )}
              {mediumUrgencyCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                  <Clock className="h-3 w-3" />
                  {mediumUrgencyCount} medie
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {completedCount} completate
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 h-9 mb-4">
              <TabsTrigger value="active" className="text-xs gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Attivi ({activePredictions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                Storico ({historyPredictions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-0 space-y-3">
              {devices.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-muted/30 border border-dashed">
                  <Smartphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Nessun dispositivo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aggiungi dispositivi per l'analisi predittiva
                  </p>
                </div>
              ) : activePredictions.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-gradient-to-br from-emerald-500/5 to-green-500/10 border border-emerald-500/20">
                  <div className="h-14 w-14 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">Tutto in ordine!</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Nessun intervento preventivo necessario al momento
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePredictions}
                    disabled={generating}
                    className="mt-4 gap-1.5"
                  >
                    {generating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Nuova Analisi
                  </Button>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {activePredictions.map((prediction, index) => (
                    <PredictionCard
                      key={prediction.id}
                      prediction={prediction}
                      device={getDeviceForPrediction(prediction.device_id)}
                      index={index}
                      onContact={() => handleContact(prediction)}
                      onSchedule={() => onSchedule?.(prediction)}
                      onComplete={() => handleComplete(prediction)}
                      onDismiss={() => {
                        setSelectedPrediction(prediction);
                        setDismissDialogOpen(true);
                      }}
                    />
                  ))}
                </AnimatePresence>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-2">
              {historyPredictions.length === 0 ? (
                <div className="text-center py-8 rounded-xl bg-muted/30 border border-dashed">
                  <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Nessuno storico</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le manutenzioni completate appariranno qui
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyPredictions.map((prediction) => {
                    const device = getDeviceForPrediction(prediction.device_id);
                    const config = predictionTypeConfig[prediction.prediction_type] || predictionTypeConfig.general_checkup;
                    const isCompleted = prediction.status === "completed";
                    
                    return (
                      <div
                        key={prediction.id}
                        className={`p-3 rounded-lg border ${
                          isCompleted 
                            ? "bg-emerald-500/5 border-emerald-500/20" 
                            : "bg-muted/30 border-muted"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            isCompleted ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"
                          }`}>
                            {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{config.label}</span>
                              {device && (
                                <span className="text-xs text-muted-foreground">
                                  • {device.brand} {device.model}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {prediction.predicted_issue}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <Badge variant="outline" className={`text-[10px] ${
                              isCompleted ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted"
                            }`}>
                              {isCompleted ? "Completata" : "Ignorata"}
                            </Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(isCompleted ? prediction.completed_at! : prediction.dismissed_at!), { 
                                addSuffix: true, 
                                locale: it 
                              })}
                            </p>
                          </div>
                        </div>
                        {prediction.dismiss_reason && (
                          <p className="text-xs text-muted-foreground mt-2 pl-11 italic">
                            "{prediction.dismiss_reason}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dismiss Dialog */}
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignora suggerimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questo suggerimento verrà spostato nello storico. Puoi aggiungere un motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo (opzionale)..."
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDismissReason("")}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDismiss}>Ignora</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Extracted Prediction Card Component for cleaner code
interface PredictionCardProps {
  prediction: MaintenancePrediction;
  device: Device | null | undefined;
  index: number;
  onContact: () => void;
  onSchedule: () => void;
  onComplete: () => void;
  onDismiss: () => void;
}

function PredictionCard({ prediction, device, index, onContact, onSchedule, onComplete, onDismiss }: PredictionCardProps) {
  const config = predictionTypeConfig[prediction.prediction_type] || predictionTypeConfig.general_checkup;
  const urgency = urgencyConfig[prediction.urgency] || urgencyConfig.low;
  const confidence = prediction.confidence_score || 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className={`relative overflow-hidden rounded-xl border-2 ${urgency.bgColor} ${urgency.ringColor} ring-1`}
    >
      {/* Urgency accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.gradient}`} />
      
      <div className="p-4">
        {/* Header: Device + Urgency */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-md`}>
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{config.label}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${urgency.color} ${urgency.bgColor}`}>
                  {prediction.urgency === "high" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                  {urgency.label}
                </Badge>
              </div>
              {device && (
                <p className="text-xs text-muted-foreground">
                  {device.brand} {device.model}
                </p>
              )}
            </div>
          </div>
          
          {/* Confidence indicator */}
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Progress value={confidence} className="w-12 h-1.5" />
              <span className="text-[10px] font-medium text-muted-foreground">{confidence}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">confidenza</p>
          </div>
        </div>

        {/* Issue description */}
        <p className="text-sm font-medium mb-2">{prediction.predicted_issue}</p>
        
        {/* Reasoning */}
        {prediction.reasoning && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {prediction.reasoning}
          </p>
        )}

        {/* Meta info pills */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {prediction.recommended_action && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
              <Wrench className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{prediction.recommended_action}</span>
            </div>
          )}
          {prediction.estimated_cost !== null && prediction.estimated_cost > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
              <Euro className="h-3 w-3" />
              {prediction.estimated_cost}
            </div>
          )}
          {prediction.due_date && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
              <Calendar className="h-3 w-3" />
              {format(new Date(prediction.due_date), "dd MMM yyyy", { locale: it })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={onContact}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Contatta
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={onSchedule}
          >
            <Calendar className="h-3.5 w-3.5" />
            Prenota
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
            onClick={onComplete}
            title="Segna come completata"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDismiss}
            title="Ignora"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
