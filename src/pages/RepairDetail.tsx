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
  Wrench
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  };
  customer: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
  };
}

export default function RepairDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

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
            customer:customers (
              name,
              phone,
              email,
              address
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setRepair({
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
      });
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

      toast({
        title: "Salvato",
        description: "Le modifiche sono state salvate con successo",
      });
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
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dettagli Riparazione</h1>
            <p className="text-muted-foreground">
              {repair.customer.name} - {repair.device.brand} {repair.device.model}
            </p>
          </div>
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salva Modifiche
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Informazioni Riparazione
              </h2>
              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="in_progress">In corso</SelectItem>
                      <SelectItem value="completed">Completata</SelectItem>
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

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  Suggerimenti IA
                </h2>
                <Button
                  onClick={getAISuggestions}
                  disabled={loadingAI}
                  variant="outline"
                  size="sm"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generazione...
                    </>
                  ) : (
                    "Genera Suggerimenti"
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

          <div className="space-y-6">
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
