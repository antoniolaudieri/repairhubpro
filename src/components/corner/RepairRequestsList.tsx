import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { List, Smartphone, Clock, User, MapPin, CheckCircle2, Package } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RepairRequest {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  service_type: string;
  created_at: string;
  estimated_cost: number | null;
  customers?: {
    name: string;
    phone: string;
  };
}

interface RepairRequestsListProps {
  requests: RepairRequest[];
  isLoading: boolean;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "In Attesa", variant: "secondary" },
  dispatched: { label: "In Assegnazione", variant: "outline" },
  assigned: { label: "Assegnato", variant: "default" },
  quote_sent: { label: "Preventivo Inviato", variant: "outline" },
  quote_accepted: { label: "Preventivo Accettato", variant: "default" },
  awaiting_pickup: { label: "In Attesa Ritiro", variant: "outline" },
  picked_up: { label: "Ritirato", variant: "default" },
  in_diagnosis: { label: "In Diagnosi", variant: "default" },
  waiting_for_parts: { label: "Attesa Ricambi", variant: "outline" },
  in_repair: { label: "In Riparazione", variant: "default" },
  repair_completed: { label: "Riparato", variant: "default" },
  ready_for_return: { label: "Pronto Reso", variant: "default" },
  at_corner: { label: "Al Corner", variant: "default" },
  delivered: { label: "Consegnato", variant: "default" },
  in_progress: { label: "In Lavorazione", variant: "default" },
  completed: { label: "Completato", variant: "default" },
  cancelled: { label: "Annullato", variant: "destructive" },
};

export const RepairRequestsList = ({ requests, isLoading, onRefresh }: RepairRequestsListProps) => {
  
  const handleDelivery = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Dispositivo consegnato al cliente!");
      onRefresh?.();
    } catch (error) {
      console.error("Error delivering:", error);
      toast.error("Errore nella consegna");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Le Mie Segnalazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Le Mie Segnalazioni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessuna segnalazione ancora. Crea la tua prima segnalazione!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Le Mie Segnalazioni ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => {
            const status = statusConfig[request.status] || statusConfig.pending;
            const isAtCorner = request.status === "at_corner";
            
            return (
              <div
                key={request.id}
                className={`p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors ${
                  isAtCorner ? 'border-emerald-500 border-2' : 'border-border'
                }`}
              >
                {/* Delivery Banner for at_corner status */}
                {isAtCorner && (
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white p-3 rounded-lg mb-3 -mt-1 -mx-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <span className="font-medium">Pronto per la consegna!</span>
                      </div>
                      <Button
                        onClick={() => handleDelivery(request.id)}
                        size="sm"
                        className="bg-white text-emerald-600 hover:bg-white/90 hover:text-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Consegna al Cliente
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {request.device_brand || "N/D"} {request.device_model || ""} 
                        <span className="text-muted-foreground ml-1">
                          ({request.device_type})
                        </span>
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {request.service_type === "domicilio" ? (
                          <>
                            <MapPin className="h-3 w-3 mr-1" />
                            Domicilio
                          </>
                        ) : (
                          "Corner"
                        )}
                      </Badge>
                    </div>

                    {request.customers && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {request.customers.name} - {request.customers.phone}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.issue_description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </span>
                      {request.estimated_cost && (
                        <span className="font-medium text-primary">
                          Preventivo: €{request.estimated_cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};