import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Wrench,
  Search,
  Package,
  AlertCircle,
  Smartphone,
  Phone,
  ChevronRight,
  Euro,
  Calendar,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Repair {
  id: string;
  status: string;
  priority: string;
  created_at: string;
  estimated_cost: number | null;
  device: {
    brand: string;
    model: string;
    device_type: string;
    reported_issue: string;
  };
  customer: {
    name: string;
    phone: string;
  };
  has_pending_orders?: boolean;
}

const statusConfig: Record<string, { label: string; bg: string; bgLight: string; text: string; icon: any }> = {
  pending: { label: "In attesa", bg: "bg-amber-500", bgLight: "bg-amber-100", text: "text-amber-700", icon: Clock },
  waiting_parts: { label: "Attesa ricambi", bg: "bg-orange-500", bgLight: "bg-orange-100", text: "text-orange-700", icon: Package },
  in_progress: { label: "In corso", bg: "bg-blue-500", bgLight: "bg-blue-100", text: "text-blue-700", icon: Wrench },
  completed: { label: "Completata", bg: "bg-emerald-500", bgLight: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  delivered: { label: "Consegnato", bg: "bg-green-600", bgLight: "bg-green-100", text: "text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Annullata", bg: "bg-red-500", bgLight: "bg-red-100", text: "text-red-700", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "Bassa", bg: "bg-slate-100", text: "text-slate-600" },
  normal: { label: "Normale", bg: "bg-blue-50", text: "text-blue-600" },
  high: { label: "Alta", bg: "bg-red-50", text: "text-red-600" },
};

export default function Repairs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const statusFilter = searchParams.get("status");

  useEffect(() => {
    loadRepairs();
  }, []);

  const loadRepairs = async () => {
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
            customer:customers (
              name,
              phone
            )
          ),
          orders (
            id,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedRepairs = data?.map((repair: any) => ({
        id: repair.id,
        status: repair.status,
        priority: repair.priority,
        created_at: repair.created_at,
        estimated_cost: repair.estimated_cost,
        device: {
          brand: repair.device.brand,
          model: repair.device.model,
          device_type: repair.device.device_type,
          reported_issue: repair.device.reported_issue,
        },
        customer: repair.device.customer,
        has_pending_orders: repair.orders?.some((order: any) => order.status === "pending") || false,
      })) || [];

      setRepairs(formattedRepairs);
    } catch (error) {
      console.error("Error loading repairs:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le riparazioni",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || repair.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const clearStatusFilter = () => {
    setSearchParams({});
  };

  const filterButtons = [
    { status: null, label: "Tutti", icon: Filter },
    { status: "pending", label: "In attesa", icon: Clock },
    { status: "in_progress", label: "In corso", icon: Wrench },
    { status: "waiting_parts", label: "Ricambi", icon: Package },
    { status: "completed", label: "Completate", icon: CheckCircle2 },
    { status: "cancelled", label: "Annullate", icon: XCircle },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <Wrench className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Caricamento riparazioni...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Gestione Riparazioni
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredRepairs.length} riparazioni {statusFilter ? `(filtrate per ${statusConfig[statusFilter]?.label || statusFilter})` : "totali"}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente, marca, modello..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border/50 shadow-sm"
            />
          </div>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => {
              const isActive = statusFilter === btn.status || (!statusFilter && !btn.status);
              return (
                <Button
                  key={btn.label}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => btn.status ? setSearchParams({ status: btn.status }) : clearStatusFilter()}
                  className={`h-9 gap-2 transition-all ${isActive ? "shadow-md" : "hover:bg-muted/50"}`}
                >
                  <btn.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{btn.label}</span>
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* Repairs List */}
        <AnimatePresence mode="popLayout">
          {filteredRepairs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Nessuna riparazione trovata</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {searchTerm
                    ? "Prova a modificare i criteri di ricerca"
                    : "Inizia creando una nuova riparazione"}
                </p>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredRepairs.map((repair, index) => {
                const status = statusConfig[repair.status] || statusConfig.pending;
                const priority = priorityConfig[repair.priority] || priorityConfig.normal;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={repair.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <Card
                      className="p-0 overflow-hidden hover:shadow-lg transition-all cursor-pointer border-border/50 group"
                      onClick={() => navigate(`/repairs/${repair.id}`)}
                    >
                      <div className="flex">
                        {/* Status indicator bar */}
                        <div className={`w-1.5 ${status.bg}`} />
                        
                        <div className="flex-1 p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            {/* Device Icon & Info */}
                            <div className="flex items-start gap-4 flex-1">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                                <Smartphone className="h-6 w-6 text-primary" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                                    {repair.customer.name}
                                  </h3>
                                  <Badge className={`${status.bgLight} ${status.text} border-0 gap-1`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                  </Badge>
                                  <Badge className={`${priority.bg} ${priority.text} border-0`}>
                                    {priority.label}
                                  </Badge>
                                  {repair.has_pending_orders && (
                                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      <span className="hidden sm:inline">Ordini</span>
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1.5 text-sm text-muted-foreground">
                                  <p className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    <span className="font-medium text-foreground">{repair.device.brand} {repair.device.model}</span>
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{repair.device.device_type}</span>
                                  </p>
                                  <p className="line-clamp-1 text-muted-foreground">
                                    {repair.device.reported_issue}
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    {repair.customer.phone}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Cost & Date */}
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                              {repair.estimated_cost ? (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Stimato</p>
                                  <p className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-1">
                                    <Euro className="h-4 w-4" />
                                    {repair.estimated_cost.toFixed(2)}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Stimato</p>
                                  <p className="text-sm text-muted-foreground">Da definire</p>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(repair.created_at).toLocaleDateString("it-IT", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </div>
                            </div>

                            {/* Arrow */}
                            <div className="hidden sm:flex items-center">
                              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
