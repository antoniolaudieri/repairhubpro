import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
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
  UserPlus,
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
  const navigate = useNavigate();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

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

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCustomerDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuovo Cliente
              </Button>
              <Button onClick={() => navigate("/new-repair")}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Lavoro
              </Button>
            </div>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">
                                {repair.device_brand} {repair.device_model}
                              </h3>
                              <Badge
                                variant="secondary"
                                className={statusConfig[repair.status]?.color}
                              >
                                {statusConfig[repair.status]?.label || repair.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {repair.issue_description}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {repair.customers?.name} - {repair.customers?.phone}
                              </span>
                              <span>
                                {format(new Date(repair.created_at), "dd MMM yyyy", {
                                  locale: it,
                                })}
                              </span>
                              {repair.estimated_cost && (
                                <span className="font-medium text-foreground">
                                  €{repair.estimated_cost.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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

      {/* Customer Dialog - reusing original component */}
      <CustomerDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onSuccess={() => {
          toast.success("Cliente creato con successo");
        }}
      />
    </CentroLayout>
  );
}
