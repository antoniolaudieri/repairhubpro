import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Percent, Calendar, Tag, Trash2, Edit, Clock, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";

interface Promo {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  applies_to: string;
  created_at: string;
}

interface PromoManagerProps {
  centroId: string | null;
}

export function PromoManager({ centroId }: PromoManagerProps) {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    valid_from: format(new Date(), "yyyy-MM-dd"),
    valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    is_active: true,
    max_uses: "",
    applies_to: "all" as "all" | "repairs" | "diagnostics" | "loyalty_members",
  });

  const fetchPromos = async () => {
    if (!centroId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("centro_promos")
      .select("*")
      .eq("centro_id", centroId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching promos:", error);
      // If table doesn't exist yet, just show empty state
      setPromos([]);
    } else {
      setPromos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPromos();
  }, [centroId]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      discount_type: "percentage",
      discount_value: 10,
      valid_from: format(new Date(), "yyyy-MM-dd"),
      valid_until: format(addDays(new Date(), 30), "yyyy-MM-dd"),
      is_active: true,
      max_uses: "",
      applies_to: "all",
    });
    setEditingPromo(null);
  };

  const handleSave = async () => {
    if (!centroId || !formData.title) {
      toast.error("Inserisci un titolo per la promozione");
      return;
    }

    const promoData = {
      centro_id: centroId,
      title: formData.title,
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until,
      is_active: formData.is_active,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      applies_to: formData.applies_to,
    };

    if (editingPromo) {
      const { error } = await supabase
        .from("centro_promos")
        .update(promoData)
        .eq("id", editingPromo.id);

      if (error) {
        toast.error("Errore nel salvataggio");
        return;
      }
      toast.success("Promozione aggiornata");
    } else {
      const { error } = await supabase
        .from("centro_promos")
        .insert(promoData);

      if (error) {
        toast.error("Errore nella creazione");
        return;
      }
      toast.success("Promozione creata");
    }

    setShowDialog(false);
    resetForm();
    fetchPromos();
  };

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      description: promo.description || "",
      discount_type: promo.discount_type as "percentage" | "fixed",
      discount_value: promo.discount_value,
      valid_from: promo.valid_from,
      valid_until: promo.valid_until,
      is_active: promo.is_active,
      max_uses: promo.max_uses?.toString() || "",
      applies_to: promo.applies_to as "all" | "repairs" | "diagnostics" | "loyalty_members",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("centro_promos")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Errore nell'eliminazione");
      return;
    }
    toast.success("Promozione eliminata");
    fetchPromos();
  };

  const toggleActive = async (promo: Promo) => {
    const { error } = await supabase
      .from("centro_promos")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    if (error) {
      toast.error("Errore nell'aggiornamento");
      return;
    }
    fetchPromos();
  };

  const appliesLabels = {
    all: "Tutti i servizi",
    repairs: "Solo riparazioni",
    diagnostics: "Solo diagnostica",
    loyalty_members: "Solo membri fedeltà",
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                Gestione Promozioni
              </CardTitle>
              <CardDescription>
                Crea e gestisci offerte speciali per i tuoi clienti
              </CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={(open) => {
              setShowDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuova Promo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromo ? "Modifica Promozione" : "Nuova Promozione"}
                  </DialogTitle>
                  <DialogDescription>
                    Configura i dettagli della promozione
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Titolo *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="es. Sconto Primavera"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrizione opzionale..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tipo Sconto</Label>
                      <Select
                        value={formData.discount_type}
                        onValueChange={(v) => setFormData({ ...formData, discount_type: v as "percentage" | "fixed" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentuale %</SelectItem>
                          <SelectItem value="fixed">Fisso €</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valore</Label>
                      <Input
                        type="number"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Data Inizio</Label>
                      <Input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fine</Label>
                      <Input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Si applica a</Label>
                    <Select
                      value={formData.applies_to}
                      onValueChange={(v) => setFormData({ ...formData, applies_to: v as typeof formData.applies_to })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti i servizi</SelectItem>
                        <SelectItem value="repairs">Solo riparazioni</SelectItem>
                        <SelectItem value="diagnostics">Solo diagnostica</SelectItem>
                        <SelectItem value="loyalty_members">Solo membri fedeltà</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Limite utilizzi (opzionale)</Label>
                    <Input
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Illimitati"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <Label>Attiva subito</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleSave}>
                    {editingPromo ? "Salva Modifiche" : "Crea Promozione"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : promos.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-4">Nessuna promozione attiva</p>
              <p className="text-sm text-muted-foreground">
                Crea la tua prima promozione per attirare nuovi clienti
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {promos.map((promo) => (
                <div
                  key={promo.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !promo.is_active || isExpired(promo.valid_until) ? "opacity-60 bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${promo.is_active && !isExpired(promo.valid_until) ? "bg-primary/20" : "bg-muted"}`}>
                      {promo.discount_type === "percentage" ? (
                        <Percent className={`h-5 w-5 ${promo.is_active && !isExpired(promo.valid_until) ? "text-primary" : "text-muted-foreground"}`} />
                      ) : (
                        <Tag className={`h-5 w-5 ${promo.is_active && !isExpired(promo.valid_until) ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{promo.title}</p>
                        <Badge variant={promo.is_active && !isExpired(promo.valid_until) ? "default" : "secondary"}>
                          {promo.discount_type === "percentage" 
                            ? `-${promo.discount_value}%` 
                            : `-€${promo.discount_value}`}
                        </Badge>
                        {isExpired(promo.valid_until) && (
                          <Badge variant="destructive">Scaduta</Badge>
                        )}
                      </div>
                      {promo.description && (
                        <p className="text-sm text-muted-foreground mt-1">{promo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(promo.valid_from), "dd MMM", { locale: it })} - {format(new Date(promo.valid_until), "dd MMM yyyy", { locale: it })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {appliesLabels[promo.applies_to]}
                        </span>
                        {promo.max_uses && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {promo.usage_count || 0}/{promo.max_uses} utilizzi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={promo.is_active}
                      onCheckedChange={() => toggleActive(promo)}
                      disabled={isExpired(promo.valid_until)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(promo.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}