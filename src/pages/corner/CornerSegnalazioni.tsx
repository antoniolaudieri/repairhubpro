import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CornerLayout } from "@/layouts/CornerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Mail, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface RepairRequest {
  id: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  status: string;
  estimated_cost: number | null;
  created_at: string;
  assigned_provider_type: string | null;
  assigned_provider_id: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  } | null;
  centro?: {
    business_name: string;
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  assigned: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  in_progress: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  completed: "bg-green-500/20 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-700 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "In Attesa",
  assigned: "Assegnata",
  in_progress: "In Corso",
  completed: "Completata",
  cancelled: "Annullata",
};

export default function CornerSegnalazioni() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cornerId, setCornerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCornerAndRequests();
    }
  }, [user]);

  const loadCornerAndRequests = async () => {
    try {
      // Get corner ID
      const { data: corner } = await supabase
        .from("corners")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (corner) {
        setCornerId(corner.id);
        await loadRequests(corner.id);
      }
    } catch (error) {
      console.error("Error loading corner:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async (cornerId: string) => {
    const { data, error } = await supabase
      .from("repair_requests")
      .select(`
        *,
        customer:customers(name, phone, email)
      `)
      .eq("corner_id", cornerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading requests:", error);
      return;
    }

    // Load centro names for assigned requests
    const requestsWithCentro = await Promise.all(
      (data || []).map(async (req) => {
        if (req.assigned_provider_type === "centro" && req.assigned_provider_id) {
          const { data: centro } = await supabase
            .from("centri_assistenza")
            .select("business_name")
            .eq("id", req.assigned_provider_id)
            .single();
          return { ...req, centro };
        }
        return req;
      })
    );

    setRequests(requestsWithCentro);
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.device_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.issue_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <CornerLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Segnalazioni</h1>
            <p className="text-muted-foreground">Gestisci le tue segnalazioni di riparazione</p>
          </div>
          <Button onClick={() => navigate("/corner/nuova-segnalazione")}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Segnalazione
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per cliente, dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="assigned">Assegnata</SelectItem>
              <SelectItem value="in_progress">In Corso</SelectItem>
              <SelectItem value="completed">Completata</SelectItem>
              <SelectItem value="cancelled">Annullata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{requests.length}</div>
              <div className="text-sm text-muted-foreground">Totale</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === "pending").length}
              </div>
              <div className="text-sm text-muted-foreground">In Attesa</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter((r) => r.status === "in_progress" || r.status === "assigned").length}
              </div>
              <div className="text-sm text-muted-foreground">In Corso</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter((r) => r.status === "completed").length}
              </div>
              <div className="text-sm text-muted-foreground">Completate</div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Nessuna segnalazione trovata</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/corner/nuova-segnalazione")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea la prima segnalazione
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          {request.device_brand} {request.device_model}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {request.device_type}
                        </Badge>
                        <Badge className={statusColors[request.status] || ""}>
                          {statusLabels[request.status] || request.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.issue_description}
                      </p>

                      {request.customer && (
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{request.customer.name}</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.customer.phone}
                          </span>
                          {request.customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.customer.email}
                            </span>
                          )}
                        </div>
                      )}

                      {request.centro && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Building2 className="h-3 w-3" />
                          <span>Assegnata a: {request.centro.business_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.created_at), "dd MMM yyyy", { locale: it })}
                      </div>
                      {request.estimated_cost && (
                        <div className="text-lg font-semibold">€{request.estimated_cost.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </CornerLayout>
  );
}
