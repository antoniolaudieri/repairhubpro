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
  Send
} from "lucide-react";
import { EnhancedQuoteDialog } from "@/components/quotes/EnhancedQuoteDialog";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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
  } | null;
}

export default function CentroLavoriCorner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CornerRequest[]>([]);
  const [inProgressRequests, setInProgressRequests] = useState<CornerRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<CornerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CornerRequest | null>(null);

  useEffect(() => {
    const fetchCentroAndRequests = async () => {
      if (!user) return;

      // Get centro ID
      const { data: centro } = await supabase
        .from("centri_assistenza")
        .select("id")
        .eq("owner_user_id", user.id)
        .single();

      if (!centro) {
        setIsLoading(false);
        return;
      }

      setCentroId(centro.id);
      await fetchRequests(centro.id);
      setIsLoading(false);
    };

    fetchCentroAndRequests();
  }, [user]);

  const fetchRequests = async (centroId: string) => {
    // Fetch repair_requests assigned to this Centro from Corners
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
        customer:customers (
          id,
          name,
          phone,
          email
        ),
        corner:corners (
          id,
          business_name,
          phone
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

    const requests = (data || []) as unknown as CornerRequest[];

    // Categorize by status
    setPendingRequests(requests.filter(r => r.status === "assigned" || r.status === "pending"));
    setInProgressRequests(requests.filter(r => r.status === "in_progress" || r.status === "waiting_for_parts" || r.status === "quote_sent" || r.status === "quote_accepted"));
    setCompletedRequests(requests.filter(r => r.status === "completed" || r.status === "delivered"));
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

  const handleAssignQuote = (request: CornerRequest) => {
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };

  const handleQuoteCreated = async () => {
    setQuoteDialogOpen(false);
    setSelectedRequest(null);
    
    // Update repair_request status to quote_sent
    if (selectedRequest) {
      await supabase
        .from("repair_requests")
        .update({ status: "quote_sent" })
        .eq("id", selectedRequest.id);
    }
    
    toast.success("Preventivo inviato!", {
      description: "Il cliente riceverà il preventivo per l'accettazione.",
    });
    
    if (centroId) fetchRequests(centroId);
  };

  const handleComplete = async (request: CornerRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({
          status: "completed",
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Lavoro completato!", {
        description: "Il Corner è stato notificato.",
      });

      if (centroId) fetchRequests(centroId);
    } catch (error: any) {
      console.error("Error completing work:", error);
      toast.error("Errore nel completare il lavoro");
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequestCard = (request: CornerRequest, type: "pending" | "in_progress" | "completed") => {
    return (
      <motion.div
        key={request.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card
          className={`p-4 ${
            type === "pending"
              ? "border-2 border-amber-500 bg-amber-50/30"
              : type === "in_progress"
              ? "border-2 border-blue-500 bg-blue-50/30"
              : ""
          }`}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  <Store className="h-3 w-3 mr-1" />
                  {request.corner?.business_name || "Corner"}
                </Badge>
                {type === "pending" && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                    <Clock className="h-3 w-3 mr-1" />
                    Nuovo
                  </Badge>
                )}
                {type === "in_progress" && (
                  <Badge className="bg-blue-500 text-white">
                    <Wrench className="h-3 w-3 mr-1" />
                    In Lavorazione
                  </Badge>
                )}
                {type === "completed" && (
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completato
                  </Badge>
                )}
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
              {request.estimated_cost && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stima</p>
                  <p className="font-semibold text-emerald-600 flex items-center">
                    <Euro className="h-3 w-3 mr-0.5" />
                    {request.estimated_cost}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{request.customer.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{request.customer.phone}</span>
              </div>
            </div>

            {/* Actions */}
            {type === "pending" && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => handleAssignQuote(request)}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Assegna Preventivo
                </Button>
              </div>
            )}

            {type === "in_progress" && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  onClick={() => handleComplete(request)}
                  disabled={processingId === request.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {processingId === request.id ? (
                    "Elaborazione..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Completa
                    </>
                  )}
                </Button>
              </div>
            )}

            {type === "completed" && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/centro/lavori`)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Vedi Dettagli
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
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
                Gestisci le richieste di riparazione dai Corner partner
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 bg-amber-50/50 border-amber-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700">{pendingRequests.length}</p>
                  <p className="text-xs text-amber-600">Nuovi</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50/50 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-700">{inProgressRequests.length}</p>
                  <p className="text-xs text-blue-600">In Corso</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{completedRequests.length}</p>
                  <p className="text-xs text-emerald-600">Completati</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Alert */}
          {pendingRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 border-2 border-amber-500 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 animate-pulse" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {pendingRequests.length} {pendingRequests.length === 1 ? "nuova richiesta" : "nuove richieste"} da Corner
                    </p>
                    <p className="text-sm text-amber-600">
                      Crea un preventivo per ogni richiesta da inviare al cliente
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="pending" className="relative">
                Nuovi
                {pendingRequests.length > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500 text-white">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Corso
                {inProgressRequests.length > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 bg-blue-500 text-white">
                    {inProgressRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">Completati</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun nuovo lavoro dai Corner</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le nuove richieste dai Corner appariranno qui
                    </p>
                  </Card>
                ) : (
                  pendingRequests.map((request) => renderRequestCard(request, "pending"))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="in_progress" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {inProgressRequests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun lavoro in corso</p>
                  </Card>
                ) : (
                  inProgressRequests.map((request) => renderRequestCard(request, "in_progress"))
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
                  completedRequests.map((request) => renderRequestCard(request, "completed"))
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>

          {/* Enhanced Quote Dialog with AI */}
          {selectedRequest && (
            <EnhancedQuoteDialog
              open={quoteDialogOpen}
              onOpenChange={setQuoteDialogOpen}
              customerId={selectedRequest.customer.id}
              initialDeviceType={selectedRequest.device_type}
              initialDeviceBrand={selectedRequest.device_brand || ""}
              initialDeviceModel={selectedRequest.device_model || ""}
              initialIssueDescription={selectedRequest.issue_description}
              onSuccess={handleQuoteCreated}
              centroId={centroId}
              repairRequestId={selectedRequest.id}
            />
          )}
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
