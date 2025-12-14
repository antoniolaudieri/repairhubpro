import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Battery, 
  Smartphone, 
  Plug, 
  HardDrive, 
  Wrench, 
  RefreshCw,
  Phone,
  Calendar,
  X,
  Euro,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Volume2,
  Camera,
  Thermometer,
  Loader2
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
  onSchedule?: (prediction: MaintenancePrediction) => void;
}

const predictionTypeIcons: Record<string, React.ReactNode> = {
  battery: <Battery className="h-4 w-4" />,
  screen: <Smartphone className="h-4 w-4" />,
  charging_port: <Plug className="h-4 w-4" />,
  storage: <HardDrive className="h-4 w-4" />,
  general_checkup: <Wrench className="h-4 w-4" />,
  software: <HardDrive className="h-4 w-4" />,
  speaker: <Volume2 className="h-4 w-4" />,
  camera: <Camera className="h-4 w-4" />,
  thermal: <Thermometer className="h-4 w-4" />,
};

const predictionTypeLabels: Record<string, string> = {
  battery: "Batteria",
  screen: "Schermo",
  charging_port: "Porta Ricarica",
  storage: "Storage",
  general_checkup: "Check-up Generale",
  software: "Software",
  speaker: "Altoparlante",
  camera: "Fotocamera",
  thermal: "Sistema Termico",
};

const urgencyConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  low: { color: "text-green-600", bgColor: "bg-green-500/10 border-green-500/20", label: "Bassa" },
  medium: { color: "text-amber-600", bgColor: "bg-amber-500/10 border-amber-500/20", label: "Media" },
  high: { color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/20", label: "Alta" },
};

export function PredictiveMaintenanceCard({ 
  customerId, 
  centroId, 
  devices,
  onSchedule 
}: PredictiveMaintenanceCardProps) {
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<MaintenancePrediction | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  const loadPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from("maintenance_predictions")
        .select("*")
        .eq("customer_id", customerId)
        .in("status", ["pending", "notified", "scheduled"])
        .order("urgency", { ascending: false })
        .order("due_date", { ascending: true });

      if (error) throw error;
      setPredictions(data || []);
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

      toast.success(`Analisi completata: ${data.predictions?.length || 0} suggerimenti generati`);
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

  const handleContact = (prediction: MaintenancePrediction) => {
    // Find the device for this prediction
    const device = devices.find(d => d.id === prediction.device_id);
    const deviceName = device ? `${device.brand} ${device.model}` : "dispositivo";
    
    const message = encodeURIComponent(
      `Salve! Dall'analisi del suo ${deviceName}, abbiamo rilevato che potrebbe essere necessaria una manutenzione preventiva: ${prediction.predicted_issue}. ` +
      `Le consigliamo: ${prediction.recommended_action}. ` +
      `Costo stimato: €${prediction.estimated_cost || 0}. Ci contatti per un appuntamento!`
    );
    
    // Open WhatsApp - you'd need customer phone from parent
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleSchedule = (prediction: MaintenancePrediction) => {
    if (onSchedule) {
      onSchedule(prediction);
    } else {
      toast.info("Funzione prenotazione in arrivo");
    }
  };

  const getDeviceForPrediction = (deviceId: string | null) => {
    if (!deviceId) return null;
    return devices.find(d => d.id === deviceId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Manutenzione Predittiva AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              Manutenzione Predittiva AI
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={generatePredictions}
              disabled={generating || devices.length === 0}
              className="h-8 text-xs"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              {generating ? "Analisi..." : "Rigenera"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun dispositivo registrato</p>
              <p className="text-xs">Aggiungi dispositivi per analisi predittiva</p>
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-6">
              <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm font-medium">Nessun intervento suggerito</p>
              <p className="text-xs text-muted-foreground mt-1">
                I dispositivi del cliente sono in buone condizioni
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={generatePredictions}
                disabled={generating}
                className="mt-3"
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                Esegui Analisi AI
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {predictions.map((prediction, index) => {
                const device = getDeviceForPrediction(prediction.device_id);
                const urgency = urgencyConfig[prediction.urgency] || urgencyConfig.low;
                const typeIcon = predictionTypeIcons[prediction.prediction_type] || <Wrench className="h-4 w-4" />;
                const typeLabel = predictionTypeLabels[prediction.prediction_type] || prediction.prediction_type;

                return (
                  <motion.div
                    key={prediction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${urgency.bgColor}`}
                  >
                    {/* Device Header */}
                    {device && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {device.brand} {device.model}
                        </span>
                      </div>
                    )}

                    {/* Prediction Info */}
                    <div className="flex items-start gap-2">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        prediction.urgency === "high" ? "bg-red-500/20 text-red-600" :
                        prediction.urgency === "medium" ? "bg-amber-500/20 text-amber-600" :
                        "bg-green-500/20 text-green-600"
                      }`}>
                        {typeIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${urgency.color}`}>
                            {prediction.urgency === "high" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                            {urgency.label}
                          </Badge>
                          <span className="text-xs font-medium">{typeLabel}</span>
                          {prediction.confidence_score && (
                            <span className="text-[10px] text-muted-foreground">
                              {prediction.confidence_score}% confidenza
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{prediction.predicted_issue}</p>
                        
                        {prediction.reasoning && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {prediction.reasoning}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {prediction.recommended_action && (
                            <div className="flex items-center gap-1 text-primary">
                              <Wrench className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{prediction.recommended_action}</span>
                            </div>
                          )}
                          {prediction.estimated_cost !== null && prediction.estimated_cost > 0 && (
                            <div className="flex items-center gap-1 text-accent">
                              <Euro className="h-3 w-3" />
                              <span>{prediction.estimated_cost}</span>
                            </div>
                          )}
                          {prediction.due_date && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(prediction.due_date), "dd MMM", { locale: it })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleContact(prediction)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contatta
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleSchedule(prediction)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Prenota
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setSelectedPrediction(prediction);
                          setDismissDialogOpen(true);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* Dismiss Dialog */}
      <AlertDialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignora suggerimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questo suggerimento non verrà più mostrato per questo dispositivo.
              Puoi aggiungere un motivo opzionale.
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
