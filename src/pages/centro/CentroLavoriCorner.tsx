import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CentroLayout } from "@/layouts/CentroLayout";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Euro,
  ChevronRight,
  Phone,
  User,
  FileText,
  Wrench,
  Send,
  Truck,
  Search,
  Package,
  ArrowRight,
  Edit,
  ShoppingCart,
  MapPin,
  Info
} from "lucide-react";
import { EnhancedQuoteDialog } from "@/components/quotes/EnhancedQuoteDialog";
import { EditQuoteDialog } from "@/components/quotes/EditQuoteDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { RepairWorkflowTimeline, getStatusLabel, getStatusColor } from "@/components/corner/RepairWorkflowTimeline";
import { CornerDetailDialog } from "@/components/corner/CornerDetailDialog";
import { sendPushNotification, getCornerUserId } from "@/services/pushNotificationService";
import { StatusSelector } from "@/components/corner/StatusSelector";

interface CornerRequest {
  id: string;
  status: string;
  created_at: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  estimated_cost: number | null;
  assigned_at: string | null;
  // Timestamp fields for workflow tracking
  quote_sent_at: string | null;
  quote_accepted_at: string | null;
  awaiting_pickup_at: string | null;
  picked_up_at: string | null;
  in_diagnosis_at: string | null;
  waiting_for_parts_at: string | null;
  in_repair_at: string | null;
  repair_completed_at: string | null;
  ready_for_return_at: string | null;
  at_corner_at: string | null;
  delivered_at: string | null;
  // Corner gestione fee fields
  corner_gestione_fee: number | null;
  corner_gestione_fee_enabled: boolean | null;
  corner_gestione_fee_collected: boolean | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
  };
  corner: {
    id: string;
    business_name: string;
    phone: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    commission_rate: number;
  } | null;
  quote?: {
    id: string;
    total_cost: number;
    status: string;
    items: any;
  } | null;
}

export default function CentroLavoriCorner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [allRequests, setAllRequests] = useState<CornerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [editQuoteDialogOpen, setEditQuoteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CornerRequest | null>(null);
  const [activeTab, setActiveTab] = useState("new");
  const [cornerDetailOpen, setCornerDetailOpen] = useState(false);
  const [selectedCornerRequest, setSelectedCornerRequest] = useState<CornerRequest | null>(null);
  const [platformRate, setPlatformRate] = useState<number>(20);
  const [centroRate, setCentroRate] = useState<number>(70);
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Handle highlight query param for direct navigation from notifications
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight && allRequests.length > 0) {
      setHighlightedId(highlight);
      // Switch to appropriate tab based on request status
      const request = allRequests.find(r => r.id === highlight);
      if (request) {
        const tab = request.status === "pending" || request.status === "assigned" 
          ? "new" 
          : request.status === "delivered" 
            ? "completed" 
            : "in_progress";
        setActiveTab(tab);
      }
      // Scroll to highlighted card after a short delay
      setTimeout(() => {
        const element = document.getElementById(`request-card-${highlight}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
      // Clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedId(null);
        setSearchParams({});
      }, 5000);
    }
  }, [searchParams, allRequests]);

  useEffect(() => {
    const fetchCentroAndRequests = async () => {
      if (!user) return;

      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id, commission_rate")
        .eq("owner_user_id", user.id)
        .single();

      if (!centro) {
        setIsLoading(false);
        return;
      }

      setCentroId(centro.id);
      setCentroRate(centro.commission_rate || 70);

      // Load platform commission rate from settings
      const { data: platformSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "platform_commission_rate")
        .single();

      if (platformSetting) {
        setPlatformRate(platformSetting.value);
      }

      await fetchRequests(centro.id);
      setIsLoading(false);
    };

    fetchCentroAndRequests();
  }, [user]);

  const fetchRequests = async (centroId: string) => {
    const { data, error } = await supabase
      .from("repair_requests")
      .select(`
        id,
        status,
        created_at,
        device_type,
        device_brand,
        device_model,
        issue_description,
        estimated_cost,
        assigned_at,
        quote_sent_at,
        quote_accepted_at,
        awaiting_pickup_at,
        picked_up_at,
        in_diagnosis_at,
        waiting_for_parts_at,
        in_repair_at,
        repair_completed_at,
        ready_for_return_at,
        at_corner_at,
        delivered_at,
        corner_gestione_fee,
        corner_gestione_fee_enabled,
        corner_gestione_fee_collected,
        customer:customers (
          id,
          name,
          phone,
          email
        ),
        corner:corners (
          id,
          business_name,
          phone,
          address,
          latitude,
          longitude,
          commission_rate
        )
      `)
      .eq("assigned_provider_type", "centro")
      .eq("assigned_provider_id", centroId)
      .not("corner_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      return;
    }

    // Load quotes for each request
    const requestsWithQuotes = await Promise.all(
      (data || []).map(async (req) => {
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("id, total_cost, status, items")
          .eq("repair_request_id", req.id)
          .maybeSingle();
        
        return { ...req, quote: quoteData } as unknown as CornerRequest;
      })
    );

    setAllRequests(requestsWithQuotes);
  };

  // Real-time subscription
  useEffect(() => {
    if (!centroId) return;

    const channel = supabase
      .channel("centro-lavori-corner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_requests",
        },
        () => {
          fetchRequests(centroId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  // Filter requests by tab
  const newRequests = allRequests.filter(r => ['pending', 'assigned'].includes(r.status));
  const quoteRequests = allRequests.filter(r => ['quote_sent', 'quote_accepted'].includes(r.status));
  const pickupRequests = allRequests.filter(r => ['awaiting_pickup', 'picked_up'].includes(r.status));
  const inLabRequests = allRequests.filter(r => ['in_diagnosis', 'waiting_for_parts', 'in_repair', 'in_progress'].includes(r.status));
  const returnRequests = allRequests.filter(r => ['repair_completed', 'ready_for_return', 'at_corner'].includes(r.status));
  const completedRequests = allRequests.filter(r => ['delivered', 'completed'].includes(r.status));

  const handleAssignQuote = (request: CornerRequest) => {
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };

  const handleEditQuote = (request: CornerRequest) => {
    setSelectedRequest(request);
    setEditQuoteDialogOpen(true);
  };

  const handleQuoteCreated = async () => {
    setQuoteDialogOpen(false);
    
    if (selectedRequest) {
      // Fetch the newly created quote
      const { data: quote } = await supabase
        .from("quotes")
        .select("id, total_cost")
        .eq("repair_request_id", selectedRequest.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      // Update repair request status
      await supabase
        .from("repair_requests")
        .update({ 
          status: "quote_sent",
          quote_sent_at: new Date().toISOString()
        })
        .eq("id", selectedRequest.id);
      
      // Send email to customer with signing link
      if (quote && centroId) {
        try {
          const { data: emailResult } = await supabase.functions.invoke("send-quote-email", {
            body: {
              quote_id: quote.id,
              repair_request_id: selectedRequest.id,
              centro_id: centroId,
            },
          });
          
          if (emailResult?.email_sent) {
            console.log("[CentroLavoriCorner] Quote email sent to customer");
          }
        } catch (emailError) {
          console.error("[CentroLavoriCorner] Error sending quote email:", emailError);
        }
      }
      
      // Send push notification to Corner
      if (selectedRequest.corner?.id) {
        const cornerUserId = await getCornerUserId(selectedRequest.corner.id);
        if (cornerUserId) {
          const deviceName = `${selectedRequest.device_brand || ''} ${selectedRequest.device_model || selectedRequest.device_type}`.trim();
          await sendPushNotification([cornerUserId], {
            title: "📋 Nuovo Preventivo Pronto!",
            body: `Preventivo per ${deviceName} inviato al cliente. Fai firmare il cliente!`,
            data: { url: "/corner/segnalazioni" },
          });
          console.log("[CentroLavoriCorner] Push notification sent to Corner");
        }
      }
    }
    
    setSelectedRequest(null);
    toast.success("Preventivo inviato al cliente!");
    if (centroId) fetchRequests(centroId);
  };

  const handleQuoteUpdated = async () => {
    setEditQuoteDialogOpen(false);
    setSelectedRequest(null);
    toast.success("Preventivo aggiornato!");
    if (centroId) fetchRequests(centroId);
  };

  const getTimestampField = (status: string): string | null => {
    const timestampMap: Record<string, string> = {
      'quote_sent': 'quote_sent_at',
      'quote_accepted': 'quote_accepted_at',
      'awaiting_pickup': 'awaiting_pickup_at',
      'picked_up': 'picked_up_at',
      'in_diagnosis': 'in_diagnosis_at',
      'waiting_for_parts': 'waiting_for_parts_at',
      'in_repair': 'in_repair_at',
      'in_progress': 'in_repair_at', // Alias per in_progress
      'repair_completed': 'repair_completed_at',
      'ready_for_return': 'ready_for_return_at',
      'at_corner': 'at_corner_at',
      'delivered': 'delivered_at',
    };
    return timestampMap[status] || null;
  };

  const updateStatus = async (request: CornerRequest, newStatus: string, message: string) => {
    setProcessingId(request.id);
    try {
      const updateData: Record<string, any> = { status: newStatus };
      
      // Add timestamp for this status change
      const timestampField = getTimestampField(newStatus);
      if (timestampField) {
        updateData[timestampField] = new Date().toISOString();
      }

      const { error } = await supabase
        .from("repair_requests")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;
      toast.success(message);
      if (centroId) fetchRequests(centroId);
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Errore nell'aggiornamento");
    } finally {
      setProcessingId(null);
    }
  };

  const getNextAction = (request: CornerRequest) => {
    const status = request.status;
    
    switch (status) {
      case 'pending':
      case 'assigned':
        return (
          <Button size="sm" onClick={() => handleAssignQuote(request)} className="flex-1">
            <Send className="h-4 w-4 mr-1" />
            Crea Preventivo
          </Button>
        );
      
      case 'quote_sent':
        return (
          <div className="flex gap-2 flex-1">
            <Button size="sm" variant="outline" onClick={() => handleEditQuote(request)} className="flex-1">
              <Edit className="h-4 w-4 mr-1" />
              Modifica
            </Button>
            <Badge variant="secondary" className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Attesa Firma
            </Badge>
          </div>
        );
      
      case 'quote_accepted':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'awaiting_pickup', 'Ritiro programmato!')}
            disabled={processingId === request.id}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            <Truck className="h-4 w-4 mr-1" />
            Programma Ritiro
          </Button>
        );
      
      case 'awaiting_pickup':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'picked_up', 'Dispositivo ritirato!')}
            disabled={processingId === request.id}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700"
          >
            <Truck className="h-4 w-4 mr-1" />
            Conferma Ritiro
          </Button>
        );
      
      case 'picked_up':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'in_diagnosis', 'Dispositivo in diagnosi!')}
            disabled={processingId === request.id}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            <Search className="h-4 w-4 mr-1" />
            Inizia Diagnosi
          </Button>
        );
      
      case 'in_diagnosis':
        return (
          <div className="flex gap-2 flex-1 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleEditQuote(request)}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-1" />
              Modifica Preventivo
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateStatus(request, 'waiting_for_parts', 'Ordine ricambi!')}
              disabled={processingId === request.id}
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-1" />
              Ordina Ricambi
            </Button>
            <Button 
              size="sm" 
              onClick={() => updateStatus(request, 'in_repair', 'Riparazione iniziata!')}
              disabled={processingId === request.id}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Wrench className="h-4 w-4 mr-1" />
              Inizia Riparazione
            </Button>
          </div>
        );
      
      case 'waiting_for_parts':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'in_repair', 'Riparazione iniziata!')}
            disabled={processingId === request.id}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Wrench className="h-4 w-4 mr-1" />
            Ricambi Arrivati - Inizia
          </Button>
        );
      
      case 'in_repair':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'repair_completed', 'Riparazione completata!')}
            disabled={processingId === request.id}
            className="flex-1 bg-teal-600 hover:bg-teal-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Completa Riparazione
          </Button>
        );
      
      case 'repair_completed':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'ready_for_return', 'Pronto per consegna!')}
            disabled={processingId === request.id}
            className="flex-1 bg-lime-600 hover:bg-lime-700"
          >
            <Store className="h-4 w-4 mr-1" />
            Prepara Consegna
          </Button>
        );
      
      case 'ready_for_return':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'at_corner', 'Consegnato al Corner!')}
            disabled={processingId === request.id}
            className="flex-1 bg-violet-600 hover:bg-violet-700"
          >
            <Truck className="h-4 w-4 mr-1" />
            Consegna al Corner
          </Button>
        );
      
      case 'at_corner':
        return (
          <Button 
            size="sm" 
            onClick={() => updateStatus(request, 'delivered', 'Cliente notificato!')}
            disabled={processingId === request.id}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <User className="h-4 w-4 mr-1" />
            Cliente Ritirato
          </Button>
        );
      
      case 'completed':
      case 'delivered':
        return (
          <div className="flex gap-2 flex-1 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateStatus(request, 'in_repair', 'Riaperto in riparazione')}
              disabled={processingId === request.id}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Riapri
            </Button>
            <Badge variant="secondary" className="flex items-center">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completato
            </Badge>
          </div>
        );
      
      default:
        return (
          <div className="flex gap-2 flex-1 flex-wrap">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => updateStatus(request, 'pending', 'Stato resettato')}
              disabled={processingId === request.id}
            >
              Resetta Stato
            </Button>
          </div>
        );
    }
  };

  const renderRequestCard = (request: CornerRequest) => {
    const isHighlighted = highlightedId === request.id;
    return (
      <motion.div
        key={request.id}
        id={`request-card-${request.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: isHighlighted ? [1, 1.02, 1] : 1,
        }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: isHighlighted ? 0.5 : 0.2 }}
      >
        <Card className={`p-4 transition-all duration-300 ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''}`}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  <Store className="h-3 w-3 mr-1" />
                  {request.corner?.business_name || "Corner"}
                </Badge>
                <Badge className={getStatusColor(request.status)}>
                  {getStatusLabel(request.status)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(request.created_at), "dd/MM HH:mm", { locale: it })}
              </span>
            </div>

            {/* Device Info */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {request.device_brand} {request.device_model || request.device_type}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {request.issue_description}
                </p>
              </div>
              {(request.quote?.total_cost || request.estimated_cost) && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Preventivo</p>
                  <p className="font-semibold text-emerald-600 flex items-center">
                    <Euro className="h-3 w-3 mr-0.5" />
                    {request.quote?.total_cost?.toFixed(2) || request.estimated_cost}
                  </p>
                </div>
              )}
            </div>

            {/* Corner Gestione Fee Badge */}
            {request.corner_gestione_fee_enabled && request.corner_gestione_fee_collected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Cliente ha già versato €{(request.corner_gestione_fee || 15).toFixed(2)} al Corner (Gestione Segnalazione)
                </span>
              </div>
            )}

            {/* Customer & Corner Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{request.customer.name}</span>
                <Phone className="h-3.5 w-3.5 ml-2" />
                <span>{request.customer.phone}</span>
              </div>
              {request.corner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setSelectedCornerRequest(request);
                    setCornerDetailOpen(true);
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  <span className="truncate">{request.corner.address}</span>
                  <Info className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Cambia stato:</span>
              <StatusSelector
                currentStatus={request.status}
                onStatusChange={(newStatus) => updateStatus(request, newStatus, `Stato cambiato in ${getStatusLabel(newStatus)}`)}
                disabled={processingId === request.id}
              />
            </div>

            {/* Workflow Timeline */}
            <RepairWorkflowTimeline 
              currentStatus={request.status} 
              compact 
              timestamps={{
                created_at: request.created_at,
                quote_sent_at: request.quote_sent_at,
                quote_accepted_at: request.quote_accepted_at,
                awaiting_pickup_at: request.awaiting_pickup_at,
                picked_up_at: request.picked_up_at,
                in_diagnosis_at: request.in_diagnosis_at,
                waiting_for_parts_at: request.waiting_for_parts_at,
                in_repair_at: request.in_repair_at,
                repair_completed_at: request.repair_completed_at,
                ready_for_return_at: request.ready_for_return_at,
                at_corner_at: request.at_corner_at,
                delivered_at: request.delivered_at,
              }}
            />

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              {getNextAction(request)}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <CentroLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                Lavori Corner
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestisci le riparazioni dai Corner partner
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <Card className="p-3 bg-amber-50/50 border-amber-200 cursor-pointer hover:bg-amber-50" onClick={() => setActiveTab("new")}>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-700">{newRequests.length}</p>
                <p className="text-xs text-amber-600">Nuovi</p>
              </div>
            </Card>
            <Card className="p-3 bg-purple-50/50 border-purple-200 cursor-pointer hover:bg-purple-50" onClick={() => setActiveTab("quote")}>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-700">{quoteRequests.length}</p>
                <p className="text-xs text-purple-600">Preventivi</p>
              </div>
            </Card>
            <Card className="p-3 bg-orange-50/50 border-orange-200 cursor-pointer hover:bg-orange-50" onClick={() => setActiveTab("pickup")}>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-700">{pickupRequests.length}</p>
                <p className="text-xs text-orange-600">Ritiro</p>
              </div>
            </Card>
            <Card className="p-3 bg-blue-50/50 border-blue-200 cursor-pointer hover:bg-blue-50" onClick={() => setActiveTab("lab")}>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-700">{inLabRequests.length}</p>
                <p className="text-xs text-blue-600">In Lab</p>
              </div>
            </Card>
            <Card className="p-3 bg-lime-50/50 border-lime-200 cursor-pointer hover:bg-lime-50" onClick={() => setActiveTab("return")}>
              <div className="text-center">
                <p className="text-xl font-bold text-lime-700">{returnRequests.length}</p>
                <p className="text-xs text-lime-600">Consegna</p>
              </div>
            </Card>
            <Card className="p-3 bg-emerald-50/50 border-emerald-200 cursor-pointer hover:bg-emerald-50" onClick={() => setActiveTab("completed")}>
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-700">{completedRequests.length}</p>
                <p className="text-xs text-emerald-600">Finiti</p>
              </div>
            </Card>
          </div>

          {/* Pending Alert */}
          {newRequests.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 border-2 border-amber-500 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 animate-pulse" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {newRequests.length} {newRequests.length === 1 ? "nuova richiesta" : "nuove richieste"} da Corner
                    </p>
                    <p className="text-sm text-amber-600">
                      Crea un preventivo per ogni richiesta
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="new" className="text-xs sm:text-sm">
                Nuovi
                {newRequests.length > 0 && <Badge className="ml-1 h-5 px-1.5 bg-amber-500">{newRequests.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="quote" className="text-xs sm:text-sm">Prev.</TabsTrigger>
              <TabsTrigger value="pickup" className="text-xs sm:text-sm">Ritiro</TabsTrigger>
              <TabsTrigger value="lab" className="text-xs sm:text-sm">Lab</TabsTrigger>
              <TabsTrigger value="return" className="text-xs sm:text-sm">Cons.</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">Finiti</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {newRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessuna nuova richiesta</p>
                  </Card>
                ) : (
                  newRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="quote" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {quoteRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun preventivo in attesa</p>
                  </Card>
                ) : (
                  quoteRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="pickup" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pickupRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Truck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun ritiro programmato</p>
                  </Card>
                ) : (
                  pickupRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="lab" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {inLabRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun dispositivo in laboratorio</p>
                  </Card>
                ) : (
                  inLabRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="return" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {returnRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessuna consegna in corso</p>
                  </Card>
                ) : (
                  returnRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="completed" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {completedRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun lavoro completato</p>
                  </Card>
                ) : (
                  completedRequests.map(renderRequestCard)
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>

      {/* Quote Dialogs */}
      {selectedRequest && quoteDialogOpen && (
        <EnhancedQuoteDialog
          open={quoteDialogOpen}
          onOpenChange={setQuoteDialogOpen}
          customerId={selectedRequest.customer.id}
          initialDeviceType={selectedRequest.device_type}
          initialDeviceBrand={selectedRequest.device_brand || ""}
          initialDeviceModel={selectedRequest.device_model || ""}
          initialIssueDescription={selectedRequest.issue_description}
          centroId={centroId}
          repairRequestId={selectedRequest.id}
          onSuccess={handleQuoteCreated}
        />
      )}

      {selectedRequest && selectedRequest.quote && editQuoteDialogOpen && (
        <EditQuoteDialog
          open={editQuoteDialogOpen}
          onOpenChange={setEditQuoteDialogOpen}
          quote={{
            id: selectedRequest.quote.id,
            customer_id: selectedRequest.customer.id,
            device_type: selectedRequest.device_type,
            device_brand: selectedRequest.device_brand,
            device_model: selectedRequest.device_model,
            issue_description: selectedRequest.issue_description,
            items: selectedRequest.quote.items,
            total_cost: selectedRequest.quote.total_cost,
            labor_cost: 0,
            parts_cost: 0,
            status: selectedRequest.quote.status,
            diagnosis: null,
            notes: null,
            valid_until: null,
            repair_request_id: selectedRequest.id,
          }}
          onSuccess={handleQuoteUpdated}
        />
      )}

      {/* Corner Detail Dialog */}
      <CornerDetailDialog
        open={cornerDetailOpen}
        onOpenChange={setCornerDetailOpen}
        corner={selectedCornerRequest?.corner || null}
        estimatedCost={selectedCornerRequest?.quote?.total_cost || selectedCornerRequest?.estimated_cost}
        platformRate={platformRate}
        centroRate={centroRate}
      />
    </CentroLayout>
  );
}
