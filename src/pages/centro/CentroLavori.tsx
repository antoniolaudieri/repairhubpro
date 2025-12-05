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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Phone,
  Building2,
  Store,
  Eye,
  Mail,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusMessage, openWhatsApp, openEmail, callPhone } from "@/utils/repairMessages";

interface Centro {
  id: string;
  business_name: string;
}

// Repair from repair_requests (dispatched from Corner)
interface DispatchedRepair {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  estimated_cost: number | null;
  created_at: string;
  assigned_at: string | null;
  source: "corner";
  customers: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
}

// Repair from repairs table (created directly by Centro)
interface DirectRepair {
  id: string;
  status: string;
  priority: string;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  delivered_at: string | null;
  source: "direct";
  device: {
    id: string;
    device_type: string;
    brand: string;
    model: string;
    reported_issue: string;
    photo_url: string | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
    };
  };
}

type CombinedRepair = DispatchedRepair | DirectRepair;

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
  waiting_for_parts: { label: "Attesa Ricambi", color: "bg-orange-500/20 text-orange-600" },
  completed: { label: "Completato", color: "bg-green-500/20 text-green-600" },
  delivered: { label: "Consegnato", color: "bg-emerald-500/20 text-emerald-600" },
  cancelled: { label: "Annullato", color: "bg-red-500/20 text-red-600" },
};

export default function CentroLavori() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [dispatchedRepairs, setDispatchedRepairs] = useState<DispatchedRepair[]>([]);
  const [directRepairs, setDirectRepairs] = useState<DirectRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
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
        // Fetch dispatched repairs (from Corners)
        const { data: dispatchedData, error: dispatchedError } = await supabase
          .from("repair_requests")
          .select(`
            *,
            customers (id, name, phone, email)
          `)
          .eq("assigned_provider_id", centroData.id)
          .eq("assigned_provider_type", "centro")
          .order("created_at", { ascending: false });

        if (dispatchedError) throw dispatchedError;
        setDispatchedRepairs(
          (dispatchedData || []).map((r) => ({ ...r, source: "corner" as const }))
        );

        // Fetch direct repairs (created by Centro)
        const { data: directData, error: directError } = await supabase
          .from("repairs")
          .select(`
            id,
            status,
            priority,
            estimated_cost,
            final_cost,
            created_at,
            started_at,
            completed_at,
            delivered_at,
            devices!inner (
              id,
              device_type,
              brand,
              model,
              reported_issue,
              photo_url,
              customers!inner (
                id,
                name,
                phone,
                email,
                centro_id
              )
            )
          `)
          .eq("devices.customers.centro_id", centroData.id)
          .order("created_at", { ascending: false });

        if (directError) throw directError;
        
        const formattedDirectRepairs: DirectRepair[] = (directData || []).map((r: any) => ({
          id: r.id,
          status: r.status,
          priority: r.priority,
          estimated_cost: r.estimated_cost,
          final_cost: r.final_cost,
          created_at: r.created_at,
          started_at: r.started_at,
          completed_at: r.completed_at,
          delivered_at: r.delivered_at,
          source: "direct" as const,
          device: {
            id: r.devices.id,
            device_type: r.devices.device_type,
            brand: r.devices.brand,
            model: r.devices.model,
            reported_issue: r.devices.reported_issue,
            photo_url: r.devices.photo_url,
            customer: {
              id: r.devices.customers.id,
              name: r.devices.customers.name,
              phone: r.devices.customers.phone,
              email: r.devices.customers.email,
            },
          },
        }));
        
        setDirectRepairs(formattedDirectRepairs);
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

  const handleUpdateDispatchedStatus = async (repairId: string, newStatus: string) => {
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

  const handleUpdateDirectStatus = async (repairId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "in_progress" && !directRepairs.find(r => r.id === repairId)?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("repairs")
        .update(updateData)
        .eq("id", repairId);

      if (error) throw error;
      toast.success("Stato aggiornato");
      fetchData();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Errore nell'aggiornamento");
    }
  };

  // Combine and filter repairs
  const allRepairs: CombinedRepair[] = [...dispatchedRepairs, ...directRepairs];
  
  const filteredRepairs = allRepairs.filter((repair) => {
    const isDispatched = repair.source === "corner";
    const deviceType = isDispatched ? (repair as DispatchedRepair).device_type : (repair as DirectRepair).device.device_type;
    const brand = isDispatched ? (repair as DispatchedRepair).device_brand : (repair as DirectRepair).device.brand;
    const model = isDispatched ? (repair as DispatchedRepair).device_model : (repair as DirectRepair).device.model;
    const issue = isDispatched ? (repair as DispatchedRepair).issue_description : (repair as DirectRepair).device.reported_issue;
    const customerName = isDispatched ? (repair as DispatchedRepair).customers?.name : (repair as DirectRepair).device.customer.name;

    const matchesSearch =
      brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || repair.status === statusFilter;
    const matchesSource = sourceFilter === "all" || repair.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const DeviceIcon = (type: string) => {
    const Icon = deviceIcons[type] || Smartphone;
    return <Icon className="h-5 w-5" />;
  };

  const getRepairDisplayInfo = (repair: CombinedRepair) => {
    if (repair.source === "corner") {
      const r = repair as DispatchedRepair;
      return {
        deviceType: r.device_type,
        brand: r.device_brand || "N/D",
        model: r.device_model || "N/D",
        issue: r.issue_description,
        customerName: r.customers?.name || "N/D",
        customerPhone: r.customers?.phone || "N/D",
        customerEmail: r.customers?.email || null,
        cost: r.estimated_cost,
        photoUrl: null,
      };
    } else {
      const r = repair as DirectRepair;
      return {
        deviceType: r.device.device_type,
        brand: r.device.brand,
        model: r.device.model,
        issue: r.device.reported_issue,
        customerName: r.device.customer.name,
        customerPhone: r.device.customer.phone,
        customerEmail: r.device.customer.email || null,
        cost: r.final_cost || r.estimated_cost,
        photoUrl: r.device.photo_url,
      };
    }
  };

  // Stats
  const totalRepairs = allRepairs.length;
  const pendingCount = allRepairs.filter((r) => r.status === "pending" || r.status === "assigned").length;
  const inProgressCount = allRepairs.filter((r) => r.status === "in_progress" || r.status === "waiting_for_parts").length;
  const completedCount = allRepairs.filter((r) => r.status === "completed").length;
  const deliveredCount = allRepairs.filter((r) => r.status === "delivered").length;

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
        <div className="p-4 lg:p-6 space-y-6">
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
              <Button onClick={() => navigate("/centro/nuovo-ritiro")}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Lavoro
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalRepairs}</p>
                    <p className="text-xs text-muted-foreground">Totale</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">In Attesa</p>
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
                    <p className="text-2xl font-bold">{inProgressCount}</p>
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
                    <p className="text-2xl font-bold">{completedCount}</p>
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
                    <p className="text-2xl font-bold">{deliveredCount}</p>
                    <p className="text-xs text-muted-foreground">Consegnati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In Attesa</SelectItem>
                <SelectItem value="in_progress">In Corso</SelectItem>
                <SelectItem value="waiting_for_parts">Attesa Ricambi</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="delivered">Consegnato</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Origine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le origini</SelectItem>
                <SelectItem value="direct">Diretti</SelectItem>
                <SelectItem value="corner">Da Corner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Repairs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Lavori ({filteredRepairs.length})
                <div className="flex gap-2 ml-auto">
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="h-3 w-3 mr-1" />
                    {directRepairs.length} Diretti
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Store className="h-3 w-3 mr-1" />
                    {dispatchedRepairs.length} Da Corner
                  </Badge>
                </div>
              </CardTitle>
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
                  {filteredRepairs.map((repair) => {
                    const info = getRepairDisplayInfo(repair);
                    const isDispatched = repair.source === "corner";

                    return (
                      <div
                        key={repair.id}
                        className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                        onClick={() => navigate(`/centro/lavori/${repair.id}`)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {info.photoUrl ? (
                              <img 
                                src={info.photoUrl} 
                                alt={`${info.brand} ${info.model}`}
                                className="w-12 h-12 rounded-lg object-cover bg-muted"
                              />
                            ) : (
                              <div className="p-2 rounded-lg bg-muted">
                                {DeviceIcon(info.deviceType)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">
                                  {info.brand} {info.model}
                                </h3>
                                <Badge
                                  variant="secondary"
                                  className={statusConfig[repair.status]?.color}
                                >
                                  {statusConfig[repair.status]?.label || repair.status}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={isDispatched ? "bg-blue-500/10 text-blue-600 border-blue-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"}
                                >
                                  {isDispatched ? (
                                    <>
                                      <Store className="h-3 w-3 mr-1" />
                                      Corner
                                    </>
                                  ) : (
                                    <>
                                      <Building2 className="h-3 w-3 mr-1" />
                                      Diretto
                                    </>
                                  )}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {info.issue}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {info.customerName} - {info.customerPhone}
                                </span>
                                <span>
                                  {format(new Date(repair.created_at), "dd MMM yyyy", {
                                    locale: it,
                                  })}
                                </span>
                                {info.cost && (
                                  <span className="font-medium text-foreground">
                                    €{info.cost.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/centro/lavori/${repair.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {/* Communication Buttons */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      callPhone(info.customerPhone);
                                    }}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Chiama</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const repairForMessage = {
                                        status: repair.status,
                                        device: { brand: info.brand, model: info.model },
                                        customer: { name: info.customerName }
                                      };
                                      const message = getStatusMessage(repairForMessage);
                                      openWhatsApp(info.customerPhone, message.body);
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>WhatsApp</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const repairForMessage = {
                                        status: repair.status,
                                        device: { brand: info.brand, model: info.model },
                                        customer: { name: info.customerName }
                                      };
                                      const message = getStatusMessage(repairForMessage);
                                      openEmail(info.customerEmail || null, message.subject, message.body);
                                    }}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <Select
                              value={repair.status}
                              onValueChange={(value) =>
                                isDispatched 
                                  ? handleUpdateDispatchedStatus(repair.id, value)
                                  : handleUpdateDirectStatus(repair.id, value)
                              }
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">In Attesa</SelectItem>
                                <SelectItem value="in_progress">In Corso</SelectItem>
                                <SelectItem value="waiting_for_parts">Attesa Ricambi</SelectItem>
                                <SelectItem value="completed">Completato</SelectItem>
                                <SelectItem value="delivered">Consegnato</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>

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
