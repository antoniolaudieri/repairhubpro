import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Lightbulb, 
  Loader2,
  Save,
  Wrench,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddRepairPartsDialog from "@/components/repair/AddRepairPartsDialog";
import { motion, AnimatePresence } from "framer-motion";

interface OrderInfo {
  id: string;
  order_number: string;
  status: string;
  supplier: string;
  created_at: string;
  ordered_at: string | null;
  received_at: string | null;
}

interface RepairPart {
  id: string;
  quantity: number;
  unit_cost: number;
  spare_parts: {
    id: string;
    name: string;
    image_url: string | null;
    brand: string | null;
    category: string;
  };
}

interface RepairDetail {
  id: string;
  status: string;
  priority: string;
  diagnosis: string | null;
  repair_notes: string | null;
  estimated_cost: number | null;
  final_cost: number | null;
  ai_suggestions: string | null;
  created_at: string;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
    initial_condition: string | null;
    photo_url: string | null;
    password: string | null;
    imei: string | null;
    serial_number: string | null;
  };
  customer: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
  orders?: OrderInfo[];
  repair_parts?: RepairPart[];
}

export default function RepairDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const [showStartedAnimation, setShowStartedAnimation] = useState(false);

  useEffect(() => {
    if (id) {
      loadRepairDetail();
    }
  }, [id]);

  const loadRepairDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          device:devices (
            brand,
            model,
            device_type,
            reported_issue,
            initial_condition,
            photo_url,
            password,
            imei,
            serial_number,
            customer:customers (
              name,
              phone,
              email,
              address
            )
          ),
          orders (
            id,
            order_number,
            status,
            supplier,
            created_at,
            ordered_at,
            received_at
          ),
          repair_parts (
            id,
            quantity,
            unit_cost,
            spare_parts (
              id,
              name,
              image_url,
              brand,
              category
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const repairData = {
        id: data.id,
        status: data.status,
        priority: data.priority,
        diagnosis: data.diagnosis,
        repair_notes: data.repair_notes,
        estimated_cost: data.estimated_cost,
        final_cost: data.final_cost,
        ai_suggestions: data.ai_suggestions,
        created_at: data.created_at,
        device: data.device,
        customer: data.device.customer,
        orders: data.orders || [],
        repair_parts: data.repair_parts || [],
      };
      setRepair(repairData);
      setPreviousStatus(data.status);
    } catch (error) {
      console.error("Error loading repair:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli della riparazione",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAISuggestions = async () => {
    if (!repair) return;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("repair-assistant", {
        body: {
          device_type: repair.device.device_type,
          brand: repair.device.brand,
          model: repair.device.model,
          issue: repair.device.reported_issue,
          condition: repair.device.initial_condition,
        },
      });

      if (error) throw error;

      const suggestions = data.suggestions;
      
      setRepair({ ...repair, ai_suggestions: suggestions });
      
      await supabase
        .from("repairs")
        .update({ ai_suggestions: suggestions })
        .eq("id", id);

      toast({
        title: "Suggerimenti IA generati",
        description: "I suggerimenti sono stati aggiunti alla riparazione",
      });
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast({
        title: "Errore",
        description: "Impossibile ottenere suggerimenti dall'IA",
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const saveChanges = async () => {
    if (!repair) return;

    const isStartingRepair = previousStatus === "pending" && repair.status === "in_progress";

    setSaving(true);
    try {
      const { error } = await supabase
        .from("repairs")
        .update({
          status: repair.status,
          priority: repair.priority,
          diagnosis: repair.diagnosis,
          repair_notes: repair.repair_notes,
          estimated_cost: repair.estimated_cost,
          final_cost: repair.final_cost,
          started_at: repair.status === "in_progress" ? new Date().toISOString() : null,
          completed_at: repair.status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      // Show special animation when repair starts
      if (isStartingRepair) {
        setShowStartedAnimation(true);
        setTimeout(() => setShowStartedAnimation(false), 3000);
        toast({
          title: "🔧 Riparazione Iniziata!",
          description: "La riparazione è ora in corso",
          className: "bg-primary text-primary-foreground border-primary",
        });
      } else {
        toast({
          title: "Salvato",
          description: "Le modifiche sono state salvate con successo",
        });
      }

      setPreviousStatus(repair.status);
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePartsAdded = (newParts: RepairPart[]) => {
    // Aggiorna lo stato locale aggiungendo i nuovi ricambi
    if (repair) {
      setRepair({
        ...repair,
        repair_parts: [...(repair.repair_parts || []), ...newParts]
      });
    }
  };

  const deleteRepairPart = async (repairPartId: string) => {
    try {
      // Aggiorna lo stato locale immediatamente per rimozione visuale
      if (repair?.repair_parts) {
        setRepair({
          ...repair,
          repair_parts: repair.repair_parts.filter(part => part.id !== repairPartId)
        });
      }

      const { error } = await supabase
        .from("repair_parts")
        .delete()
        .eq("id", repairPartId);

      if (error) throw error;

      toast({
        title: "Eliminato",
        description: "Ricambio rimosso dalla riparazione",
      });
    } catch (error) {
      console.error("Error deleting repair part:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il ricambio",
        variant: "destructive",
      });
      // Ricarica in caso di errore
      loadRepairDetail();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento dettagli...</p>
        </div>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Riparazione non trovata</h2>
          <Button onClick={() => navigate("/repairs")}>Torna alle riparazioni</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 relative">
      {/* Animation overlay when repair starts */}
      <AnimatePresence>
        {showStartedAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-primary/90 text-primary-foreground px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: 2, ease: "linear" }}
              >
                <Wrench className="h-10 w-10" />
              </motion.div>
              <div>
                <p className="text-2xl font-bold">Riparazione Iniziata!</p>
                <p className="text-sm opacity-80">Lavori in corso...</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dettagli Riparazione</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {repair.customer.name} - {repair.device.brand} {repair.device.model}
            </p>
          </div>
          <Button onClick={saveChanges} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Salvataggio...</span>
                <span className="sm:hidden">Salva...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Salva Modifiche</span>
                <span className="sm:hidden">Salva</span>
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">Informazioni Riparazione</span>
                <span className="sm:hidden">Riparazione</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Stato</Label>
                  <Select
                    value={repair.status}
                    onValueChange={(value) => setRepair({ ...repair, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="waiting_parts">In attesa ricambi</SelectItem>
                      <SelectItem value="in_progress">In corso</SelectItem>
                      <SelectItem value="completed">Completata</SelectItem>
                      <SelectItem value="delivered">Consegnato</SelectItem>
                      <SelectItem value="cancelled">Annullata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priorità</Label>
                  <Select
                    value={repair.priority}
                    onValueChange={(value) => setRepair({ ...repair, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Bassa</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Costo Stimato (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={repair.estimated_cost || ""}
                    onChange={(e) =>
                      setRepair({ ...repair, estimated_cost: parseFloat(e.target.value) || null })
                    }
                  />
                </div>
                <div>
                  <Label>Costo Finale (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={repair.final_cost || ""}
                    onChange={(e) =>
                      setRepair({ ...repair, final_cost: parseFloat(e.target.value) || null })
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>Diagnosi</Label>
                <Textarea
                  placeholder="Inserisci la diagnosi del problema..."
                  value={repair.diagnosis || ""}
                  onChange={(e) => setRepair({ ...repair, diagnosis: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="mt-4">
                <Label>Note Riparazione</Label>
                <Textarea
                  placeholder="Note tecniche, parti sostituite, procedure..."
                  value={repair.repair_notes || ""}
                  onChange={(e) => setRepair({ ...repair, repair_notes: e.target.value })}
                  rows={4}
                />
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  <span className="hidden sm:inline">Suggerimenti IA</span>
                  <span className="sm:hidden">IA</span>
                </h2>
                <Button
                  onClick={getAISuggestions}
                  disabled={loadingAI}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Generazione...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Genera Suggerimenti</span>
                      <span className="sm:hidden">Genera</span>
                    </>
                  )}
                </Button>
              </div>
              {repair.ai_suggestions ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 text-sm whitespace-pre-wrap">
                    {repair.ai_suggestions}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Clicca su "Genera Suggerimenti" per ottenere consigli dall'IA su come
                  procedere con questa riparazione.
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Spare Parts Section */}
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="hidden sm:inline">Ricambi Utilizzati</span>
                  <span className="sm:hidden">Ricambi</span>
                </h3>
                <AddRepairPartsDialog
                  repairId={repair.id}
                  deviceBrand={repair.device.brand}
                  deviceModel={repair.device.model}
                  onPartsAdded={handlePartsAdded}
                />
              </div>

              {repair.repair_parts && repair.repair_parts.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {repair.repair_parts.map((part) => (
                      <motion.div
                        key={part.id}
                        initial={{ opacity: 0, height: 0, scale: 0.8 }}
                        animate={{ opacity: 1, height: "auto", scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.8, x: -100 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg bg-accent/5"
                      >
                        {part.spare_parts.image_url && (
                          <img
                            src={part.spare_parts.image_url}
                            alt={part.spare_parts.name}
                            className="h-12 w-12 object-contain rounded border bg-background"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{part.spare_parts.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {part.spare_parts.brand && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {part.spare_parts.brand}
                              </span>
                            )}
                            <span>{part.spare_parts.category}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qtà: {part.quantity}</p>
                          <p className="text-sm text-muted-foreground">
                            €{part.unit_cost.toFixed(2)} cad.
                          </p>
                          <p className="text-sm font-semibold">
                            Tot: €{(part.quantity * part.unit_cost).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRepairPart(part.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div className="pt-3 border-t border-border">
                    <p className="text-right font-semibold">
                      Totale Ricambi: €
                      {repair.repair_parts
                        .reduce(
                          (sum, part) => sum + part.quantity * part.unit_cost,
                          0
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun ricambio associato a questa riparazione
                </p>
              )}
            </Card>

            {/* Orders Status */}
            {repair.orders && repair.orders.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Stato Ordini Ricambi
                </h3>
                <div className="space-y-3">
                  {repair.orders.map((order) => {
                    const statusInfo = order.status === "pending" 
                      ? { label: "In Attesa", variant: "secondary" as const, icon: Clock }
                      : order.status === "ordered"
                      ? { label: "Ordinato", variant: "default" as const, icon: Package }
                      : { label: "Ricevuto", variant: "default" as const, icon: CheckCircle };
                    
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div key={order.id} className="p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Ordine #{order.order_number}</span>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Fornitore: {order.supplier}</div>
                          <div>Creato: {new Date(order.created_at).toLocaleDateString("it-IT")}</div>
                          {order.ordered_at && (
                            <div>Ordinato: {new Date(order.ordered_at).toLocaleDateString("it-IT")}</div>
                          )}
                          {order.received_at && (
                            <div>Ricevuto: {new Date(order.received_at).toLocaleDateString("it-IT")}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {repair.orders.some(o => o.status === "pending") && (
                  <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      La riparazione è in attesa della consegna dei ricambi ordinati
                    </p>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Informazioni Cliente</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{repair.customer.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefono:</span>
                  <p className="font-medium">{repair.customer.phone}</p>
                </div>
                {repair.customer.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{repair.customer.email}</p>
                  </div>
                )}
                {repair.customer.address && (
                  <div>
                    <span className="text-muted-foreground">Indirizzo:</span>
                    <p className="font-medium">{repair.customer.address}</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Informazioni Dispositivo</h3>
              {repair.device.photo_url && (
                <img
                  src={repair.device.photo_url}
                  alt="Device"
                  className="w-full rounded-lg mb-4"
                />
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{repair.device.device_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Marca:</span>
                  <p className="font-medium">{repair.device.brand}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modello:</span>
                  <p className="font-medium">{repair.device.model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Problema Riportato:</span>
                  <p className="font-medium">{repair.device.reported_issue}</p>
                </div>
                {repair.device.initial_condition && (
                  <div>
                    <span className="text-muted-foreground">Condizioni Iniziali:</span>
                    <p className="font-medium">{repair.device.initial_condition}</p>
                  </div>
                )}
                {(repair.device.password || repair.device.imei || repair.device.serial_number) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-primary mb-3">Accesso Dispositivo</h4>
                    {repair.device.password && (
                      <div className="mb-2">
                        <span className="text-muted-foreground">PIN/Password:</span>
                        <p className="font-mono font-medium bg-muted/50 px-2 py-1 rounded mt-1">
                          {repair.device.password}
                        </p>
                      </div>
                    )}
                    {repair.device.imei && (
                      <div className="mb-2">
                        <span className="text-muted-foreground">IMEI:</span>
                        <p className="font-mono font-medium">{repair.device.imei}</p>
                      </div>
                    )}
                    {repair.device.serial_number && (
                      <div>
                        <span className="text-muted-foreground">Seriale:</span>
                        <p className="font-mono font-medium">{repair.device.serial_number}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Timeline</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Creata il:</span>
                  <p className="font-medium">
                    {new Date(repair.created_at).toLocaleString("it-IT")}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
