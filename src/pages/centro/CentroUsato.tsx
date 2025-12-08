import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CentroLayout } from "@/layouts/CentroLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import {
  Package,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  ShoppingCart,
  Upload,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const conditionOptions = [
  { value: "ricondizionato", label: "Ricondizionato" },
  { value: "usato_ottimo", label: "Usato Ottimo" },
  { value: "usato_buono", label: "Usato Buono" },
  { value: "usato_discreto", label: "Usato Discreto" },
  { value: "alienato", label: "Alienato" },
];

const sourceOptions = [
  { value: "riparazione_alienata", label: "Riparazione Alienata" },
  { value: "permuta", label: "Permuta" },
  { value: "acquisto", label: "Acquisto" },
  { value: "ricondizionato", label: "Ricondizionato" },
];

const deviceTypes = ["Smartphone", "Tablet", "Laptop", "PC", "Smartwatch", "Altro"];

export default function CentroUsato() {
  const { user } = useAuth();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    device_type: "Smartphone",
    brand: "",
    model: "",
    color: "",
    storage_capacity: "",
    condition: "usato_buono",
    price: "",
    original_price: "",
    description: "",
    warranty_months: "0",
    source: "acquisto",
  });

  useEffect(() => {
    fetchCentroId();
  }, [user]);

  useEffect(() => {
    if (centroId) {
      fetchDevices();
      fetchReservations();
    }
  }, [centroId]);

  const fetchCentroId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("centri_assistenza")
      .select("id")
      .eq("owner_user_id", user.id)
      .single();
    if (data) setCentroId(data.id);
  };

  const fetchDevices = async () => {
    if (!centroId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("used_devices")
        .select("*")
        .eq("centro_id", centroId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    if (!centroId) return;
    try {
      const { data, error } = await supabase
        .from("used_device_reservations")
        .select(`
          *,
          device:used_devices(id, brand, model, price)
        `)
        .in("device_id", devices.map(d => d.id))
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  useEffect(() => {
    if (devices.length > 0) {
      fetchReservations();
    }
  }, [devices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centroId) return;

    setFormLoading(true);
    try {
      const deviceData = {
        centro_id: centroId,
        device_type: formData.device_type,
        brand: formData.brand,
        model: formData.model,
        color: formData.color || null,
        storage_capacity: formData.storage_capacity || null,
        condition: formData.condition as "ricondizionato" | "usato_ottimo" | "usato_buono" | "usato_discreto" | "alienato",
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        description: formData.description || null,
        warranty_months: parseInt(formData.warranty_months) || 0,
        source: formData.source as "riparazione_alienata" | "permuta" | "acquisto" | "ricondizionato",
        status: "draft" as const,
      };

      if (editingDevice) {
        const { error } = await supabase
          .from("used_devices")
          .update(deviceData)
          .eq("id", editingDevice.id);
        if (error) throw error;
        toast({ title: "Dispositivo aggiornato" });
      } else {
        const { error } = await supabase
          .from("used_devices")
          .insert([deviceData]);
        if (error) throw error;
        toast({ title: "Dispositivo aggiunto" });
      }

      setDialogOpen(false);
      resetForm();
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      device_type: "Smartphone",
      brand: "",
      model: "",
      color: "",
      storage_capacity: "",
      condition: "usato_buono",
      price: "",
      original_price: "",
      description: "",
      warranty_months: "0",
      source: "acquisto",
    });
    setEditingDevice(null);
  };

  const handleEdit = (device: any) => {
    setFormData({
      device_type: device.device_type,
      brand: device.brand,
      model: device.model,
      color: device.color || "",
      storage_capacity: device.storage_capacity || "",
      condition: device.condition,
      price: device.price.toString(),
      original_price: device.original_price?.toString() || "",
      description: device.description || "",
      warranty_months: device.warranty_months?.toString() || "0",
      source: device.source,
    });
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const handlePublish = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("used_devices")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", deviceId);
      if (error) throw error;
      toast({ title: "Dispositivo pubblicato" });
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm("Eliminare questo dispositivo?")) return;
    try {
      const { error } = await supabase
        .from("used_devices")
        .delete()
        .eq("id", deviceId);
      if (error) throw error;
      toast({ title: "Dispositivo eliminato" });
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const handleReservationAction = async (reservationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("used_device_reservations")
        .update({ status })
        .eq("id", reservationId);
      if (error) throw error;

      if (status === "confirmed") {
        // Get reservation to find device_id
        const reservation = reservations.find(r => r.id === reservationId);
        if (reservation) {
          await supabase
            .from("used_devices")
            .update({ status: "reserved", reserved_at: new Date().toISOString() })
            .eq("id", reservation.device_id);
        }
      }

      toast({ title: status === "confirmed" ? "Prenotazione confermata" : "Prenotazione annullata" });
      fetchReservations();
      fetchDevices();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Bozza</Badge>;
      case "published":
        return <Badge className="bg-success">Pubblicato</Badge>;
      case "reserved":
        return <Badge className="bg-warning">Prenotato</Badge>;
      case "sold":
        return <Badge className="bg-primary">Venduto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: devices.length,
    published: devices.filter(d => d.status === "published").length,
    reserved: devices.filter(d => d.status === "reserved").length,
    sold: devices.filter(d => d.status === "sold").length,
    pendingReservations: reservations.filter(r => r.status === "pending").length,
  };

  return (
    <CentroLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestione Usato</h1>
            <p className="text-muted-foreground">Pubblica e gestisci dispositivi usati e ricondizionati</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Aggiungi Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDevice ? "Modifica" : "Nuovo"} Dispositivo</DialogTitle>
                <DialogDescription>
                  Compila i dettagli del dispositivo da mettere in vendita
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo Dispositivo *</Label>
                    <Select value={formData.device_type} onValueChange={v => setFormData(prev => ({ ...prev, device_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {deviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Condizione *</Label>
                    <Select value={formData.condition} onValueChange={v => setFormData(prev => ({ ...prev, condition: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca *</Label>
                    <Input value={formData.brand} onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Modello *</Label>
                    <Input value={formData.model} onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Colore</Label>
                    <Input value={formData.color} onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacità</Label>
                    <Input value={formData.storage_capacity} onChange={e => setFormData(prev => ({ ...prev, storage_capacity: e.target.value }))} placeholder="128GB" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Prezzo €*</Label>
                    <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Prezzo Originale €</Label>
                    <Input type="number" step="0.01" value={formData.original_price} onChange={e => setFormData(prev => ({ ...prev, original_price: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Garanzia (mesi)</Label>
                    <Input type="number" value={formData.warranty_months} onChange={e => setFormData(prev => ({ ...prev, warranty_months: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Provenienza</Label>
                  <Select value={formData.source} onValueChange={v => setFormData(prev => ({ ...prev, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? "Salvataggio..." : editingDevice ? "Aggiorna" : "Salva Bozza"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Totale</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{stats.published}</p>
                  <p className="text-xs text-muted-foreground">Pubblicati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{stats.reserved}</p>
                  <p className="text-xs text-muted-foreground">Prenotati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.sold}</p>
                  <p className="text-xs text-muted-foreground">Venduti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={stats.pendingReservations > 0 ? "border-warning" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-8 w-8 ${stats.pendingReservations > 0 ? "text-warning" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReservations}</p>
                  <p className="text-xs text-muted-foreground">Richieste</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="devices">
          <TabsList>
            <TabsTrigger value="devices">Dispositivi</TabsTrigger>
            <TabsTrigger value="reservations" className="relative">
              Prenotazioni
              {stats.pendingReservations > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] px-1.5 bg-warning text-warning-foreground">
                  {stats.pendingReservations}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : devices.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessun dispositivo</h3>
                  <p className="text-muted-foreground mb-4">Aggiungi il primo dispositivo usato da vendere</p>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Aggiungi Dispositivo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Condizione</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Visite</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.brand} {device.model}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.storage_capacity} {device.color && `• ${device.color}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {conditionOptions.find(c => c.value === device.condition)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>€{device.price.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell>{device.views_count || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {device.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => handlePublish(device.id)} className="gap-1">
                              <Eye className="h-3 w-3" />
                              Pubblica
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(device)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(device.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="mt-4">
            {reservations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessuna prenotazione</h3>
                  <p className="text-muted-foreground">Le richieste dei clienti appariranno qui</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{res.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{res.customer_email}</p>
                          <p className="text-xs text-muted-foreground">{res.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.device ? `${res.device.brand} ${res.device.model}` : "N/D"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(res.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={res.status === "pending" ? "default" : res.status === "confirmed" ? "default" : "secondary"}>
                          {res.status === "pending" ? "In attesa" : res.status === "confirmed" ? "Confermata" : "Annullata"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {res.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => handleReservationAction(res.id, "confirmed")} className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Conferma
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReservationAction(res.id, "cancelled")}>
                              Annulla
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CentroLayout>
  );
}