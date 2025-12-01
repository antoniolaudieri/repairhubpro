import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Search
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
}

export default function Repairs() {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      case "cancelled":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      completed: "secondary",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      pending: "In attesa",
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

  const filteredRepairs = repairs.filter(
    (repair) =>
      repair.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repair.device.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestione Riparazioni
              </h1>
              <p className="text-muted-foreground">
                Visualizza e gestisci tutte le riparazioni
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per cliente, marca o modello..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-2"
                onClick={() => navigate(`/repairs/${repair.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{getStatusIcon(repair.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {repair.customer.name}
                        </h3>
                        {getStatusBadge(repair.status)}
                        {getPriorityBadge(repair.priority)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <span className="font-medium">Dispositivo:</span>{" "}
                          {repair.device.brand} {repair.device.model} ({repair.device.device_type})
                        </p>
                        <p>
                          <span className="font-medium">Problema:</span>{" "}
                          {repair.device.reported_issue}
                        </p>
                        <p>
                          <span className="font-medium">Tel:</span> {repair.customer.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {repair.estimated_cost && (
                      <p className="text-2xl font-bold text-primary mb-2">
                        €{repair.estimated_cost.toFixed(2)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
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
