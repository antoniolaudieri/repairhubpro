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
  ArrowLeft,
  Search,
  Package,
  AlertCircle,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "in_progress":
        return <Wrench className="h-5 w-5 text-info" />;
      case "waiting_parts":
        return <Package className="h-5 w-5 text-warning" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      waiting_parts: "secondary",
      in_progress: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      pending: "In attesa",
      waiting_parts: "In attesa ricambi",
      in_progress: "In corso",
      completed: "Completata",
      cancelled: "Annullata",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      high: "bg-destructive/10 text-destructive border-destructive/20",
      normal: "bg-info/10 text-info border-info/20",
      low: "bg-muted text-muted-foreground border-border",
    };

    const labels: Record<string, string> = {
      high: "Alta",
      normal: "Normale",
      low: "Bassa",
    };

    return (
      <Badge variant="outline" className={colors[priority]}>
        {labels[priority] || priority}
      </Badge>
    );
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

  const getStatusFilterLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "In attesa",
      waiting_parts: "In attesa ricambi",
      in_progress: "In corso",
      completed: "Completata",
      cancelled: "Annullata",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento riparazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Gestione Riparazioni
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visualizza e gestisci tutte le riparazioni
          </p>
        </div>

        <div className="mb-4 sm:mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente, marca, modello..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          
          {/* Quick filter buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!statusFilter ? "default" : "outline"}
              size="sm"
              onClick={clearStatusFilter}
              className="h-8"
            >
              Tutti
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ status: "pending" })}
              className="h-8 gap-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              In attesa
            </Button>
            <Button
              variant={statusFilter === "in_progress" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ status: "in_progress" })}
              className="h-8 gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5" />
              In corso
            </Button>
            <Button
              variant={statusFilter === "waiting_parts" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ status: "waiting_parts" })}
              className="h-8 gap-1.5"
            >
              <Package className="h-3.5 w-3.5" />
              Attesa ricambi
            </Button>
            <Button
              variant={statusFilter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ status: "completed" })}
              className="h-8 gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completate
            </Button>
            <Button
              variant={statusFilter === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ status: "cancelled" })}
              className="h-8 gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Annullate
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredRepairs.length === 0 ? (
            <Card className="p-12 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessuna riparazione trovata</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Prova a modificare i criteri di ricerca"
                  : "Inizia creando una nuova riparazione"}
              </p>
            </Card>
          ) : (
            filteredRepairs.map((repair) => (
              <Card
                key={repair.id}
                className="p-4 sm:p-6 hover:shadow-lg transition-all cursor-pointer border-2"
                onClick={() => navigate(`/repairs/${repair.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  {/* Mobile: Status icon and info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(repair.status)}</div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground">
                          {repair.customer.name}
                        </h3>
                        {getStatusBadge(repair.status)}
                        {getPriorityBadge(repair.priority)}
                        {repair.has_pending_orders && (
                          <Badge variant="outline" className="gap-1 bg-warning/10 text-warning border-warning/20 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            <span className="hidden sm:inline">Ordini in attesa</span>
                            <span className="sm:hidden">Ordini</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                        <p className="line-clamp-1">
                          <span className="font-medium">Dispositivo:</span>{" "}
                          {repair.device.brand} {repair.device.model}
                        </p>
                        <p className="line-clamp-2 sm:line-clamp-1">
                          <span className="font-medium">Problema:</span>{" "}
                          {repair.device.reported_issue}
                        </p>
                        <p>
                          <span className="font-medium">Tel:</span> {repair.customer.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile: Cost and date below, Desktop: right side */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                    {repair.estimated_cost && (
                      <p className="text-xl sm:text-2xl font-bold text-primary sm:mb-2">
                        €{repair.estimated_cost.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(repair.created_at).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
