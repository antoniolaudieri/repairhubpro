import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { StatusBadge, DIRECT_REPAIR_STATUSES } from "@/components/repair/VisualStatusManager";
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
  AlertTriangle,
  Eye,
  MessageCircle,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatusMessage, openWhatsApp, openEmail, callPhone } from "@/utils/repairMessages";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Centro {
  id: string;
  business_name: string;
}

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

const deviceIcons: Record<string, any> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  smartwatch: Watch,
  computer: Monitor,
  console: Gamepad,
};

export default function CentroLavori() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centro, setCentro] = useState<Centro | null>(null);
  const [repairs, setRepairs] = useState<DirectRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: centroData, error: centroError } = await supabase
        .from("centri_assistenza")
        .select("id, business_name")
        .eq("owner_user_id", user.id)
        .single();

      if (centroError) throw centroError;
      setCentro(centroData);

      if (centroData) {
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
        
        const formattedRepairs: DirectRepair[] = (directData || []).map((r: any) => ({
          id: r.id,
          status: r.status,
          priority: r.priority,
          estimated_cost: r.estimated_cost,
          final_cost: r.final_cost,
          created_at: r.created_at,
          started_at: r.started_at,
          completed_at: r.completed_at,
          delivered_at: r.delivered_at,
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
        
        setRepairs(formattedRepairs);
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
      const updateData: any = { status: newStatus };
      
      if (newStatus === "in_progress" && !repairs.find(r => r.id === repairId)?.started_at) {
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

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.device.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.reported_issue?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || repair.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const DeviceIcon = (type: string) => {
    const Icon = deviceIcons[type] || Smartphone;
    return <Icon className="h-5 w-5" />;
  };

  // Stats
  const totalRepairs = repairs.length;
  const pendingCount = repairs.filter((r) => r.status === "pending" || r.status === "assigned").length;
  const inProgressCount = repairs.filter((r) => r.status === "in_progress" || r.status === "waiting_for_parts").length;
  const completedCount = repairs.filter((r) => r.status === "completed").length;
  const deliveredCount = repairs.filter((r) => r.status === "delivered").length;
  const forfeitedCount = repairs.filter((r) => r.status === "forfeited").length;

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
              <h1 className="text-2xl font-bold">Lavori Diretti</h1>
              <p className="text-muted-foreground">
                Riparazioni create direttamente dal tuo centro
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
            {forfeitedCount > 0 && (
              <Card className="bg-card/50 border-rose-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-500/10">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-rose-600">{forfeitedCount}</p>
                      <p className="text-xs text-muted-foreground">Alienati</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                <SelectItem value="forfeited">Alienato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Repairs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Lavori ({filteredRepairs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRepairs.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nessun lavoro trovato</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/centro/nuovo-ritiro")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Nuovo Lavoro
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRepairs.map((repair, index) => {
                    return (
                      <motion.div
                        key={repair.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card
                          className="hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 group"
                          onClick={() => navigate(`/centro/lavori/${repair.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex items-start gap-4">
                                {repair.device.photo_url ? (
                                  <div className="relative">
                                    <img
                                      src={repair.device.photo_url}
                                      alt="Device"
                                      className="h-16 w-16 rounded-xl object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all">
                                    {DeviceIcon(repair.device.device_type)}
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">
                                      {repair.device.brand} {repair.device.model}
                                    </h3>
                                    <StatusBadge status={repair.status} statuses={DIRECT_REPAIR_STATUSES} />
                                  {/* Forfeiture countdown badge */}
                                  {repair.status === 'completed' && repair.completed_at && !repair.delivered_at && (() => {
                                    const daysRemaining = 30 - differenceInDays(new Date(), new Date(repair.completed_at));
                                    return (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge 
                                              variant="outline"
                                              className={
                                                daysRemaining <= 3 ? "border-destructive text-destructive bg-destructive/10" :
                                                daysRemaining <= 7 ? "border-amber-500 text-amber-600 bg-amber-500/10" :
                                                "border-muted-foreground/30 text-muted-foreground"
                                              }
                                            >
                                              <AlertTriangle className="h-3 w-3 mr-1" />
                                              {daysRemaining <= 0 ? "SCADUTO" : `${daysRemaining}g`}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-sm">
                                              {daysRemaining <= 0 
                                                ? "Dispositivo in alienazione" 
                                                : `${daysRemaining} giorni al ritiro (Art. 2756 c.c.)`
                                              }
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })()}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {repair.device.reported_issue}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {repair.device.customer.name}
                                  </span>
                                  <span>
                                    {format(new Date(repair.created_at), "dd MMM yyyy", { locale: it })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => callPhone(repair.device.customer.phone)}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Chiama</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const repairInfo = {
                                          status: repair.status,
                                          device: {
                                            brand: repair.device.brand,
                                            model: repair.device.model,
                                          },
                                          customer: {
                                            name: repair.device.customer.name,
                                          },
                                        };
                                        const message = getStatusMessage(repairInfo);
                                        openWhatsApp(repair.device.customer.phone, message.body);
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>WhatsApp</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {repair.device.customer.email && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const repairInfo = {
                                            status: repair.status,
                                            device: {
                                              brand: repair.device.brand,
                                              model: repair.device.model,
                                            },
                                            customer: {
                                              name: repair.device.customer.name,
                                            },
                                          };
                                          const message = getStatusMessage(repairInfo);
                                          openEmail(repair.device.customer.email!, message.subject, message.body);
                                        }}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Email</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              <Select
                                value={repair.status}
                                onValueChange={(value) => handleUpdateStatus(repair.id, value)}
                              >
                                <SelectTrigger className="w-32">
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

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/centro/lavori/${repair.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
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
          setIsCustomerDialogOpen(false);
          toast.success("Cliente creato con successo");
        }}
      />
    </CentroLayout>
  );
}
