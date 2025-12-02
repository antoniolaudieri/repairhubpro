import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  X,
  Euro,
  Loader2,
  Sparkles,
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
  { value: "scocca", label: "Scocca" },
  { value: "connettori", label: "Connettori" },
  { value: "fotocamera", label: "Fotocamera" },
  { value: "audio", label: "Audio" },
  { value: "scheda_madre", label: "Scheda Madre" },
  { value: "tastiera", label: "Tastiera" },
  { value: "manutenzione", label: "Manutenzione" },
  { value: "diagnosi", label: "Diagnosi" },
  { value: "general", label: "Generale" },
];

const DEVICE_TYPES = [
  { value: "", label: "Tutti i dispositivi" },
  { value: "smartphone", label: "Smartphone" },
  { value: "tablet", label: "Tablet" },
  { value: "laptop", label: "Laptop" },
  { value: "desktop", label: "Desktop" },
  { value: "console", label: "Console" },
];

const PricingSettings = () => {
  const [laborPrices, setLaborPrices] = useState<LaborPrice[]>([]);
  const [services, setServices] = useState<AdditionalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Labor dialog state
  const [laborDialogOpen, setLaborDialogOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<LaborPrice | null>(null);
  const [laborForm, setLaborForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "general",
    device_type: "",
  });
  
  // Service dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdditionalService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    is_active: true,
  });
  
  // Delete confirmation
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
      console.error("Error loading data:", error);
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  // Labor functions
  const openLaborDialog = (labor?: LaborPrice) => {
    if (labor) {
      setEditingLabor(labor);
      setLaborForm({
        name: labor.name,
        description: labor.description || "",
        price: labor.price.toString(),
        category: labor.category,
        device_type: labor.device_type || "",
      });
    } else {
      setEditingLabor(null);
      setLaborForm({ name: "", description: "", price: "", category: "general", device_type: "" });
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
        device_type: laborForm.device_type || null,
      };

      if (editingLabor) {
        const { error } = await supabase
          .from("labor_prices")
          .update(data)
          .eq("id", editingLabor.id);
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
      console.error("Error saving labor:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // Service functions
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
        const { error } = await supabase
          .from("additional_services")
          .update(data)
          .eq("id", editingService.id);
        if (error) throw error;
        toast.success("Servizio aggiornato");
      } else {
        const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.sort_order)) : 0;
        const { error } = await supabase.from("additional_services").insert({
          ...data,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
        toast.success("Servizio creato");
      }

      setServiceDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  // Delete function
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
      console.error("Error deleting:", error);
      toast.error("Errore nell'eliminazione");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Toggle service active state
  const toggleServiceActive = async (service: AdditionalService) => {
    try {
      const { error } = await supabase
        .from("additional_services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);
      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error("Error toggling service:", error);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento impostazioni...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gradient-mesh">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-elegant">
              <Settings2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Listino Prezzi
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestisci i prezzi della manodopera e dei servizi aggiuntivi
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="labor" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-14 p-1 bg-muted/50 backdrop-blur-sm">
            <TabsTrigger 
              value="labor" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-elegant transition-all duration-300"
            >
              <Hammer className="h-5 w-5" />
              Manodopera
            </TabsTrigger>
            <TabsTrigger 
              value="services"
              className="flex items-center gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-elegant transition-all duration-300"
            >
              <Wrench className="h-5 w-5" />
              Servizi
            </TabsTrigger>
          </TabsList>

          {/* Labor Tab */}
          <TabsContent value="labor" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Prezzi Manodopera</h2>
                  <p className="text-sm text-muted-foreground">
                    {laborPrices.length} lavorazioni configurate
                  </p>
                </div>
                <Button
                  onClick={() => openLaborDialog()}
                  className="gap-2 shadow-elegant hover:shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Nuova Lavorazione
                </Button>
              </div>

              <div className="space-y-6">
                {Object.entries(groupedLabor).map(([category, items], categoryIndex) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: categoryIndex * 0.1 }}
                  >
                    <Card className="overflow-hidden border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
                      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="h-5 w-5 text-primary" />
                          {LABOR_CATEGORIES.find(c => c.value === category)?.label || category}
                          <span className="text-sm font-normal text-muted-foreground ml-auto">
                            {items.length} voci
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                          <AnimatePresence>
                            {items.map((labor, index) => (
                              <motion.div
                                key={labor.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-4 hover:bg-accent/5 transition-colors group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium">{labor.name}</h4>
                                      {labor.device_type && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                          {DEVICE_TYPES.find(d => d.value === labor.device_type)?.label}
                                        </span>
                                      )}
                                    </div>
                                    {labor.description && (
                                      <p className="text-sm text-muted-foreground mt-1 truncate">
                                        {labor.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span className="text-xl font-bold text-primary">
                                        €{labor.price.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openLaborDialog(labor)}
                                        className="h-8 w-8"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => confirmDelete("labor", labor.id, labor.name)}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Servizi Aggiuntivi</h2>
                  <p className="text-sm text-muted-foreground">
                    {services.filter(s => s.is_active).length} servizi attivi su {services.length}
                  </p>
                </div>
                <Button
                  onClick={() => openServiceDialog()}
                  className="gap-2 shadow-elegant hover:shadow-lg transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Nuovo Servizio
                </Button>
              </div>

              <Card className="overflow-hidden border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    <AnimatePresence>
                      {services.map((service, index) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 transition-colors group ${
                            service.is_active ? "hover:bg-accent/5" : "bg-muted/30 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={service.is_active}
                              onCheckedChange={() => toggleServiceActive(service)}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium ${!service.is_active && "line-through"}`}>
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xl font-bold text-primary">
                                  €{service.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openServiceDialog(service)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDelete("service", service.id, service.name)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Labor Dialog */}
      <Dialog open={laborDialogOpen} onOpenChange={setLaborDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary" />
              {editingLabor ? "Modifica Lavorazione" : "Nuova Lavorazione"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="labor-name">Nome *</Label>
              <Input
                id="labor-name"
                value={laborForm.name}
                onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })}
                placeholder="Es. Sostituzione Schermo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labor-description">Descrizione</Label>
              <Textarea
                id="labor-description"
                value={laborForm.description}
                onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })}
                placeholder="Descrizione opzionale..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="labor-price">Prezzo (€) *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="labor-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={laborForm.price}
                    onChange={(e) => setLaborForm({ ...laborForm, price: e.target.value })}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={laborForm.category}
                  onValueChange={(v) => setLaborForm({ ...laborForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo Dispositivo</Label>
              <Select
                value={laborForm.device_type}
                onValueChange={(v) => setLaborForm({ ...laborForm, device_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i dispositivi" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaborDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={saveLabor} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {editingService ? "Modifica Servizio" : "Nuovo Servizio"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Nome *</Label>
              <Input
                id="service-name"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="Es. Trasferimento Dati"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-description">Descrizione</Label>
              <Textarea
                id="service-description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                placeholder="Descrizione opzionale..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-price">Prezzo (€) *</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="service-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="service-active">Servizio Attivo</Label>
              <Switch
                id="service-active"
                checked={serviceForm.is_active}
                onCheckedChange={(checked) => setServiceForm({ ...serviceForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={saveService} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{itemToDelete?.name}"? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PricingSettings;