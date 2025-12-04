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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Phone, Mail, Calendar, Building2, ChevronDown, ChevronUp, FileText, Package, Wrench, Headphones, Truck, Store, User, CheckCircle2 } from "lucide-react";
import { RepairWorkflowTimeline, getStatusLabel, getStatusColor } from "@/components/corner/RepairWorkflowTimeline";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface QuoteItem {
  description: string;
  quantity: number;
  total: number;
  type: 'part' | 'labor' | 'service';
}

interface Quote {
  id: string;
  total_cost: number;
  status: string;
  signed_at: string | null;
  items: string;
  created_at: string;
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
  quote?: Quote | null;
}

// Use imported getStatusColor and getStatusLabel from RepairWorkflowTimeline

const quoteStatusLabels: Record<string, string> = {
  pending: "In Attesa Firma",
  accepted: "Accettato",
  rejected: "Rifiutato",
};

export default function CornerSegnalazioni() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cornerId, setCornerId] = useState<string | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());

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

    // Load centro names and quotes for requests
    const requestsWithData = await Promise.all(
      (data || []).map(async (req) => {
        let centro = null;
        let quote = null;

        // Load centro info
        if (req.assigned_provider_type === "centro" && req.assigned_provider_id) {
          const { data: centroData } = await supabase
            .from("centri_assistenza")
            .select("business_name")
            .eq("id", req.assigned_provider_id)
            .single();
          centro = centroData;
        }

        // Load quote linked to this repair_request
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("id, total_cost, status, signed_at, items, created_at")
          .eq("repair_request_id", req.id)
          .maybeSingle();
        
        quote = quoteData;

        return { ...req, centro, quote };
      })
    );

    setRequests(requestsWithData);
  };

  const toggleQuoteExpanded = (requestId: string) => {
    setExpandedQuotes(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const parseQuoteItems = (itemsJson: string): QuoteItem[] => {
    try {
      return JSON.parse(itemsJson);
    } catch {
      return [];
    }
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
              <SelectItem value="quote_sent">Preventivo Inviato</SelectItem>
              <SelectItem value="quote_accepted">Preventivo Accettato</SelectItem>
              <SelectItem value="awaiting_pickup">In Attesa Ritiro</SelectItem>
              <SelectItem value="picked_up">Ritirato</SelectItem>
              <SelectItem value="in_diagnosis">In Diagnosi</SelectItem>
              <SelectItem value="waiting_for_parts">Attesa Ricambi</SelectItem>
              <SelectItem value="in_repair">In Riparazione</SelectItem>
              <SelectItem value="repair_completed">Riparato</SelectItem>
              <SelectItem value="at_corner">Al Corner</SelectItem>
              <SelectItem value="delivered">Consegnato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold">{requests.length}</div>
              <div className="text-xs text-muted-foreground">Totale</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === "pending" || r.status === "assigned").length}
              </div>
              <div className="text-xs text-muted-foreground">In Attesa</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-600">
                {requests.filter((r) => r.status === "quote_sent" || r.status === "quote_accepted").length}
              </div>
              <div className="text-xs text-muted-foreground">Preventivi</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">
                {requests.filter((r) => ['awaiting_pickup', 'picked_up', 'in_diagnosis', 'waiting_for_parts', 'in_repair'].includes(r.status)).length}
              </div>
              <div className="text-xs text-muted-foreground">In Lavoro</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-violet-600">
                {requests.filter((r) => r.status === "at_corner").length}
              </div>
              <div className="text-xs text-muted-foreground">Al Corner</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">
                {requests.filter((r) => r.status === "delivered").length}
              </div>
              <div className="text-xs text-muted-foreground">Consegnate</div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for devices at Corner */}
        {requests.filter((r) => r.status === "at_corner").length > 0 && (
          <Card className="p-4 border-2 border-violet-500 bg-violet-50/50">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-violet-600 animate-pulse" />
              <div>
                <p className="font-semibold text-violet-800">
                  {requests.filter((r) => r.status === "at_corner").length} dispositivi pronti per il ritiro cliente
                </p>
                <p className="text-sm text-violet-600">
                  Contatta i clienti per la consegna
                </p>
              </div>
            </div>
          </Card>
        )}

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
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusLabel(request.status)}
                        </Badge>
                        {request.quote && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <FileText className="h-3 w-3 mr-1" />
                            Preventivo
                          </Badge>
                        )}
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

                      {/* Workflow Timeline */}
                      {!['pending', 'assigned'].includes(request.status) && (
                        <div className="mt-2 pt-2 border-t">
                          <RepairWorkflowTimeline currentStatus={request.status} compact />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.created_at), "dd MMM yyyy", { locale: it })}
                      </div>
                      {request.quote ? (
                        <div className="text-lg font-semibold text-primary">€{request.quote.total_cost.toFixed(2)}</div>
                      ) : request.estimated_cost ? (
                        <div className="text-lg font-semibold">€{request.estimated_cost.toFixed(2)}</div>
                      ) : null}
                    </div>
                  </div>

                  {/* Quote Details Section - Only visible for Corner without unit prices */}
                  {request.quote && (
                    <Collapsible 
                      open={expandedQuotes.has(request.id)}
                      onOpenChange={() => toggleQuoteExpanded(request.id)}
                      className="mt-4"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Dettagli Preventivo
                            <Badge variant="secondary" className="ml-2">
                              {request.quote.signed_at 
                                ? "Firmato" 
                                : quoteStatusLabels[request.quote.status] || request.quote.status}
                            </Badge>
                          </span>
                          {expandedQuotes.has(request.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="text-sm text-muted-foreground mb-2">
                            Creato: {format(new Date(request.quote.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                          </div>
                          
                          {/* Items list - showing only description and total, NOT unit price */}
                          <div className="space-y-2">
                            {parseQuoteItems(request.quote.items).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="h-6 w-6 rounded flex items-center justify-center bg-background">
                                    {item.type === 'part' && <Package className="h-3.5 w-3.5 text-blue-600" />}
                                    {item.type === 'labor' && <Wrench className="h-3.5 w-3.5 text-amber-600" />}
                                    {item.type === 'service' && <Headphones className="h-3.5 w-3.5 text-purple-600" />}
                                  </div>
                                  <span className="text-sm truncate">{item.description}</span>
                                  {item.quantity > 1 && (
                                    <Badge variant="secondary" className="text-xs">x{item.quantity}</Badge>
                                  )}
                                </div>
                                <span className="font-medium text-sm">€{item.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Total */}
                          <div className="flex justify-between items-center pt-3 border-t border-border font-semibold">
                            <span>Totale Preventivo</span>
                            <span className="text-lg text-primary">€{request.quote.total_cost.toFixed(2)}</span>
                          </div>

                          {request.quote.signed_at && (
                            <div className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                              ✓ Firmato il {format(new Date(request.quote.signed_at), "dd MMM yyyy HH:mm", { locale: it })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </CornerLayout>
  );
}
