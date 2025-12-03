import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, User, Clock, MapPin, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface RepairRequest {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  service_type: string;
  assigned_at: string;
  estimated_cost: number | null;
  customers?: {
    name: string;
    phone: string;
  };
}

interface ActiveJobsListProps {
  jobs: RepairRequest[];
  isLoading: boolean;
  onComplete?: (jobId: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  assigned: { label: "Assegnato", variant: "secondary" },
  in_progress: { label: "In Lavorazione", variant: "default" },
  completed: { label: "Completato", variant: "default" },
};

export const ActiveJobsList = ({ jobs, isLoading, onComplete }: ActiveJobsListProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            I Miei Lavori
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

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            I Miei Lavori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessun lavoro attivo. Accetta un'offerta per iniziare!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          I Miei Lavori ({jobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {jobs.map((job) => {
            const status = statusConfig[job.status] || statusConfig.assigned;
            
            return (
              <div
                key={job.id}
                className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {job.device_brand || "N/D"} {job.device_model || ""} 
                        <span className="text-muted-foreground ml-1">
                          ({job.device_type})
                        </span>
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {job.customers && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {job.customers.name} - {job.customers.phone}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.issue_description}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {job.service_type === "domicilio" ? "A Domicilio" : "In Negozio"}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Assegnato: {format(new Date(job.assigned_at), "dd MMM HH:mm", { locale: it })}
                      </span>
                      {job.estimated_cost && (
                        <span className="font-medium text-primary">
                          €{job.estimated_cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {job.status !== "completed" && onComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onComplete(job.id)}
                      className="whitespace-nowrap"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completa
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
