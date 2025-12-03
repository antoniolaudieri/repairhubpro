import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Save,
  Euro,
  Loader2,
  Settings2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LaborPrice {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  device_type: string | null;
}

interface AdditionalService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
}

const LABOR_CATEGORIES = [
  { value: "display", label: "Display" },
  { value: "batteria", label: "Batteria" },
  { value: "connettori", label: "Connettori" },
  { value: "fotocamera", label: "Fotocamera" },
  { value: "audio", label: "Audio" },
  { value: "scheda_madre", label: "Scheda Madre" },
  { value: "manutenzione", label: "Manutenzione" },
  { value: "general", label: "Generale" },
];

export default function CentroListino() {
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<LaborPrice | null>(null);
  const [laborForm, setLaborForm] = useState({ name: "", description: "", price: "", category: "general", device_type: "" });
  
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdditionalService | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", price: "", is_active: true });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "labor" | "service"; id: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [laborResult, servicesResult] = await Promise.all([
        supabase.from("labor_prices").select("*").order("category").order("name"),
        supabase.from("additional_services").select("*").order("sort_order"),
      ]);

      if (laborResult.error) throw laborResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setLaborPrices(laborResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error: any) {
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  const openLaborDialog = (labor?: LaborPrice) => {
    if (labor) {
      setEditingLabor(labor);
      setLaborForm({
        name: labor.name,
        description: labor.description || "",
        price: labor.price.toString(),
        category: labor.category,
        device_type: labor.device_type || "all",
      });
    } else {
      setEditingLabor(null);
      setLaborForm({ name: "", description: "", price: "", category: "general", device_type: "all" });
    }
    setLaborDialogOpen(true);
  };

  const saveLabor = async () => {
    if (!laborForm.name || !laborForm.price) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: laborForm.name,
        description: laborForm.description || null,
        price: parseFloat(laborForm.price),
        category: laborForm.category,
        device_type: laborForm.device_type === "all" ? null : laborForm.device_type,
      };

      if (editingLabor) {
        const { error } = await supabase.from("labor_prices").update(data).eq("id", editingLabor.id);
        if (error) throw error;
        toast.success("Lavorazione aggiornata");
      } else {
        const { error } = await supabase.from("labor_prices").insert(data);
        if (error) throw error;
        toast.success("Lavorazione creata");
      }

      setLaborDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const openServiceDialog = (service?: AdditionalService) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        description: service.description || "",
        price: service.price.toString(),
        is_active: service.is_active,
      });
    } else {
      setEditingService(null);
      setServiceForm({ name: "", description: "", price: "", is_active: true });
    }
    setServiceDialogOpen(true);
  };

  const saveService = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: serviceForm.name,
        description: serviceForm.description || null,
        price: parseFloat(serviceForm.price),
        is_active: serviceForm.is_active,
      };

      if (editingService) {
        const { error } = await supabase.from("additional_services").update(data).eq("id", editingService.id);
        if (error) throw error;
        toast.success("Servizio aggiornato");
      } else {
        const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) : 0;
        const { error } = await supabase.from("additional_services").insert({ ...data, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast.success("Servizio creato");
      }

      setServiceDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (type: "labor" | "service", id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const table = itemToDelete.type === "labor" ? "labor_prices" : "additional_services";
      const { error } = await supabase.from(table).delete().eq("id", itemToDelete.id);
      if (error) throw error;
      toast.success("Eliminato con successo");
      loadData();
    } catch (error: any) {
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleServiceActive = async (service: AdditionalService) => {
    try {
      const { error } = await supabase.from("additional_services").update({ is_active: !service.is_active }).eq("id", service.id);
      if (error) throw error;
      loadData();
    } catch (error: any) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const groupedLabor = laborPrices.reduce((acc, labor) => {
    const category = labor.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(labor);
    return acc;
  }, {} as Record<string, LaborPrice[]>);

  if (loading) {
    return (
      <CentroLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Settings2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Listino Prezzi</h1>
          <p className="text-muted-foreground mt-2">Gestisci i prezzi della manodopera e dei servizi</p>
        </div>

        <Tabs defaultValue="labor" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
            <TabsTrigger value="labor" className="flex items-center gap-2">
              <Hammer className="h-4 w-4" />Manodopera
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />Servizi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="labor" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Prezzi Manodopera</h2>
                <p className="text-sm text-muted-foreground">{laborPrices.length} lavorazioni</p>
              </div>
              <Button onClick={() => openLaborDialog()} className="gap-2">
                <Plus className="h-4 w-4" />Nuova
              </Button>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedLabor).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg">
                      {LABOR_CATEGORIES.find(c => c.value === category)?.label || category}
                      <span className="text-sm font-normal text-muted-foreground ml-2">({items.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y">
                    {items.map((labor) => (
                      <div key={labor.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                        <div>
                          <h4 className="font-medium">{labor.name}</h4>
                          {labor.description && <p className="text-sm text-muted-foreground">{labor.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-primary">€{labor.price.toFixed(2)}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openLaborDialog(labor)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirmDelete("labor", labor.id, labor.name)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Servizi Aggiuntivi</h2>
                <p className="text-sm text-muted-foreground">{services.length} servizi</p>
              </div>
              <Button onClick={() => openServiceDialog()} className="gap-2">
                <Plus className="h-4 w-4" />Nuovo
              </Button>
            </div>

            <Card>
              <CardContent className="p-0 divide-y">
                {services.map((service) => (
                  <div key={service.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <Switch checked={service.is_active} onCheckedChange={() => toggleServiceActive(service)} />
                      <div className={!service.is_active ? "opacity-50" : ""}>
                        <h4 className="font-medium">{service.name}</h4>
                        {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-primary">€{service.price.toFixed(2)}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => openServiceDialog(service)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => confirmDelete("service", service.id, service.name)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Labor Dialog */}
        <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLabor ? "Modifica Lavorazione" : "Nuova Lavorazione"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={laborForm.name} onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea value={laborForm.description} onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })} />
              </div>
              <div>
                <Label>Prezzo (€) *</Label>
                <Input type="number" value={laborForm.price} onChange={(e) => setLaborForm({ ...laborForm, price: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={laborForm.category} onValueChange={(val) => setLaborForm({ ...laborForm, category: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LABOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLaborDialogOpen(false)}>Annulla</Button>
              <Button onClick={saveLabor} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Service Dialog */}
        <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? "Modifica Servizio" : "Nuovo Servizio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrizione</Label>
                <Textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
              </div>
              <div>
                <Label>Prezzo (€) *</Label>
                <Input type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={serviceForm.is_active} onCheckedChange={(val) => setServiceForm({ ...serviceForm, is_active: val })} />
                <Label>Attivo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>Annulla</Button>
              <Button onClick={saveService} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina "{itemToDelete?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Elimina</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CentroLayout>
  );
}
