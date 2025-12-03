import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Smartphone, 
  Laptop, 
  Tablet, 
  Watch, 
  Monitor, 
  Gamepad,
  Clock,
  Wrench,
  CheckCircle2,
  Package,
  User,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Centro {
  id: string;
  business_name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface RepairRequest {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  estimated_cost: number | null;
  created_at: string;
  assigned_at: string | null;
  customers: Customer;
}

const deviceIcons: Record<string, any> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  smartwatch: Watch,
  computer: Monitor,
  console: Gamepad,
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "In Attesa", color: "bg-yellow-500/20 text-yellow-600" },
  assigned: { label: "Assegnato", color: "bg-blue-500/20 text-blue-600" },
  in_progress: { label: "In Corso", color: "bg-primary/20 text-primary" },
  completed: { label: "Completato", color: "bg-green-500/20 text-green-600" },
  delivered: { label: "Consegnato", color: "bg-emerald-500/20 text-emerald-600" },
};

export default function CentroLavori() {
  const { user } = useAuth();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // New repair form state
  const [newRepair, setNewRepair] = useState({
    customer_id: "",
    device_type: "smartphone",
    device_brand: "",
    device_model: "",
    issue_description: "",
    estimated_cost: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch centro
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
        // Fetch repairs assigned to this centro
        const { data: repairsData, error: repairsError } = await supabase
          .from("repair_requests")
          .select(`
            *,
            customers (id, name, phone, email)
          `)
          .eq("assigned_provider_id", centroData.id)
          .eq("assigned_provider_type", "centro")
          .order("created_at", { ascending: false });

        if (repairsError) throw repairsError;
        setRepairs(repairsData || []);

        // Fetch customers for creating new repairs
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name, phone, email")
          .order("name");

        setCustomers(customersData || []);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCreateRepair = async () => {
    if (!centro || !newRepair.customer_id || !newRepair.issue_description) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("repair_requests").insert({
        customer_id: newRepair.customer_id,
        device_type: newRepair.device_type,
        device_brand: newRepair.device_brand || null,
        device_model: newRepair.device_model || null,
        issue_description: newRepair.issue_description,
        estimated_cost: newRepair.estimated_cost ? parseFloat(newRepair.estimated_cost) : null,
        assigned_provider_id: centro.id,
        assigned_provider_type: "centro",
        assigned_at: new Date().toISOString(),
        status: "assigned",
      });

      if (error) throw error;

      toast.success("Lavoro creato con successo");
      setIsCreateDialogOpen(false);
      setNewRepair({
        customer_id: "",
        device_type: "smartphone",
        device_brand: "",
        device_model: "",
        issue_description: "",
        estimated_cost: "",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error creating repair:", error);
      toast.error("Errore nella creazione del lavoro");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (repairId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({ status: newStatus })
        .eq("id", repairId);

      if (error) throw error;
      toast.success("Stato aggiornato");
      fetchData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.device_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.issue_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || repair.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const DeviceIcon = (type: string) => {
    const Icon = deviceIcons[type] || Smartphone;
    return <Icon className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Gestione Lavori</h1>
              <p className="text-muted-foreground">
                Gestisci le riparazioni del tuo centro
              </p>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Lavoro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crea Nuovo Lavoro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Select
                      value={newRepair.customer_id}
                      onValueChange={(value) =>
                        setNewRepair({ ...newRepair, customer_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo Dispositivo</Label>
                      <Select
                        value={newRepair.device_type}
                        onValueChange={(value) =>
                          setNewRepair({ ...newRepair, device_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smartphone">Smartphone</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                          <SelectItem value="smartwatch">Smartwatch</SelectItem>
                          <SelectItem value="computer">Computer</SelectItem>
                          <SelectItem value="console">Console</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Costo Stimato (€)</Label>
                      <Input
                        type="number"
                        value={newRepair.estimated_cost}
                        onChange={(e) =>
                          setNewRepair({ ...newRepair, estimated_cost: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marca</Label>
                      <Input
                        value={newRepair.device_brand}
                        onChange={(e) =>
                          setNewRepair({ ...newRepair, device_brand: e.target.value })
                        }
                        placeholder="es. Apple, Samsung"
                      />
                    </div>
                    <div>
                      <Label>Modello</Label>
                      <Input
                        value={newRepair.device_model}
                        onChange={(e) =>
                          setNewRepair({ ...newRepair, device_model: e.target.value })
                        }
                        placeholder="es. iPhone 14, Galaxy S23"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Descrizione Problema *</Label>
                    <Textarea
                      value={newRepair.issue_description}
                      onChange={(e) =>
                        setNewRepair({ ...newRepair, issue_description: e.target.value })
                      }
                      placeholder="Descrivi il problema del dispositivo..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Annulla
                    </Button>
                    <Button onClick={handleCreateRepair} disabled={isCreating}>
                      {isCreating ? "Creazione..." : "Crea Lavoro"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per cliente, dispositivo o problema..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="assigned">Assegnato</SelectItem>
                <SelectItem value="in_progress">In Corso</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="delivered">Consegnato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {repairs.filter((r) => r.status === "assigned").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Assegnati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {repairs.filter((r) => r.status === "in_progress").length}
                    </p>
                    <p className="text-xs text-muted-foreground">In Corso</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {repairs.filter((r) => r.status === "completed").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Completati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {repairs.filter((r) => r.status === "delivered").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Consegnati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repairs List */}
          <Card>
            <CardHeader>
              <CardTitle>Lavori ({filteredRepairs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRepairs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun lavoro trovato</p>
                  <p className="text-sm">Crea il tuo primo lavoro per iniziare</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRepairs.map((repair) => (
                    <div
                      key={repair.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            {DeviceIcon(repair.device_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {repair.device_brand || "N/D"} {repair.device_model || ""}
                              </span>
                              <Badge
                                className={
                                  statusConfig[repair.status]?.color || "bg-muted"
                                }
                              >
                                {statusConfig[repair.status]?.label || repair.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {repair.issue_description}
                            </p>
                            {repair.customers && (
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {repair.customers.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {repair.customers.phone}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Creato:{" "}
                              {format(new Date(repair.created_at), "dd MMM yyyy HH:mm", {
                                locale: it,
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {repair.estimated_cost && (
                            <span className="text-sm font-medium">
                              €{repair.estimated_cost.toFixed(2)}
                            </span>
                          )}
                          <Select
                            value={repair.status}
                            onValueChange={(value) =>
                              handleUpdateStatus(repair.id, value)
                            }
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assigned">Assegnato</SelectItem>
                              <SelectItem value="in_progress">In Corso</SelectItem>
                              <SelectItem value="completed">Completato</SelectItem>
                              <SelectItem value="delivered">Consegnato</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}