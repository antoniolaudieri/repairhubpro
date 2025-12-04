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
  X,
  AlertCircle,
  Smartphone,
  Euro,
  ChevronRight,
  Phone,
  User,
  MapPin,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { it } from "date-fns/locale";

interface JobOffer {
  id: string;
  status: string;
  expires_at: string;
  created_at: string;
  distance_km: number | null;
  repair_request: {
    id: string;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    issue_description: string;
    estimated_cost: number | null;
    status: string;
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
  };
}

export default function CentroLavoriCorner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centroId, setCentroId] = useState<string | null>(null);
  const [pendingOffers, setPendingOffers] = useState<JobOffer[]>([]);
  const [acceptedOffers, setAcceptedOffers] = useState<JobOffer[]>([]);
  const [declinedOffers, setDeclinedOffers] = useState<JobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCentroAndOffers = async () => {
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
      await fetchOffers(centro.id);
      setIsLoading(false);
    };

    fetchCentroAndOffers();
  }, [user]);

  const fetchOffers = async (centroId: string) => {
    const { data, error } = await supabase
      .from("job_offers")
      .select(`
        id,
        status,
        expires_at,
        created_at,
        distance_km,
        repair_request:repair_requests (
          id,
          device_type,
          device_brand,
          device_model,
          issue_description,
          estimated_cost,
          status,
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
        )
      `)
      .eq("provider_type", "centro")
      .eq("provider_id", centroId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offers:", error);
      return;
    }

    const offers = (data || []) as unknown as JobOffer[];
    const now = new Date();

    setPendingOffers(
      offers.filter(
        (o) => o.status === "pending" && new Date(o.expires_at) > now
      )
    );
    setAcceptedOffers(offers.filter((o) => o.status === "accepted"));
    setDeclinedOffers(
      offers.filter(
        (o) => o.status === "declined" || (o.status === "pending" && new Date(o.expires_at) <= now)
      )
    );
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
          table: "job_offers",
        },
        () => {
          fetchOffers(centroId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  const handleAcceptOffer = async (offer: JobOffer) => {
    setProcessingId(offer.id);
    try {
      // Update job offer status
      const { error: offerError } = await supabase
        .from("job_offers")
        .update({
          status: "accepted",
          response_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      // Assign repair request to this Centro
      const { error: requestError } = await supabase
        .from("repair_requests")
        .update({
          assigned_provider_type: "centro",
          assigned_provider_id: centroId,
          assigned_at: new Date().toISOString(),
          status: "assigned",
        })
        .eq("id", offer.repair_request.id);

      if (requestError) throw requestError;

      toast.success("Lavoro accettato!", {
        description: "Il cliente è stato notificato. Puoi ora emettere il preventivo.",
      });

      // Refresh offers
      if (centroId) fetchOffers(centroId);
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error("Errore nell'accettare il lavoro");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineOffer = async (offer: JobOffer) => {
    setProcessingId(offer.id);
    try {
      const { error } = await supabase
        .from("job_offers")
        .update({
          status: "declined",
          response_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      if (error) throw error;

      toast.info("Lavoro rifiutato");
      if (centroId) fetchOffers(centroId);
    } catch (error: any) {
      console.error("Error declining offer:", error);
      toast.error("Errore nel rifiutare il lavoro");
    } finally {
      setProcessingId(null);
    }
  };

  const renderOfferCard = (offer: JobOffer, showActions: boolean = false) => {
    const expiresAt = new Date(offer.expires_at);
    const isExpiringSoon = showActions && expiresAt.getTime() - Date.now() < 5 * 60 * 1000;
    const isExpired = expiresAt <= new Date();

    return (
      <motion.div
        key={offer.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card
          className={`p-4 ${
            showActions
              ? isExpiringSoon
                ? "border-2 border-red-500 bg-red-50/30"
                : "border-2 border-amber-500 bg-amber-50/30"
              : ""
          }`}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  <Store className="h-3 w-3 mr-1" />
                  {offer.repair_request.corner?.business_name || "Corner"}
                </Badge>
                {showActions && (
                  <Badge
                    variant="outline"
                    className={`${
                      isExpiringSoon
                        ? "border-red-500 text-red-600"
                        : "border-amber-500 text-amber-600"
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {isExpired
                      ? "Scaduto"
                      : `Scade ${formatDistanceToNow(expiresAt, { addSuffix: true, locale: it })}`}
                  </Badge>
                )}
                {offer.status === "accepted" && (
                  <Badge className="bg-emerald-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Accettato
                  </Badge>
                )}
                {(offer.status === "declined" || isExpired) && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    <X className="h-3 w-3 mr-1" />
                    {isExpired ? "Scaduto" : "Rifiutato"}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(offer.created_at), "dd/MM HH:mm")}
              </span>
            </div>

            {/* Device Info */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {offer.repair_request.device_brand} {offer.repair_request.device_model || offer.repair_request.device_type}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {offer.repair_request.issue_description}
                </p>
              </div>
              {offer.repair_request.estimated_cost && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Stima</p>
                  <p className="font-semibold text-emerald-600 flex items-center">
                    <Euro className="h-3 w-3 mr-0.5" />
                    {offer.repair_request.estimated_cost}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                <span>{offer.repair_request.customer.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{offer.repair_request.customer.phone}</span>
              </div>
              {offer.distance_km && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{offer.distance_km.toFixed(1)} km</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {showActions && !isExpired && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeclineOffer(offer)}
                  disabled={processingId === offer.id}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rifiuta
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAcceptOffer(offer)}
                  disabled={processingId === offer.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {processingId === offer.id ? (
                    "Elaborazione..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Accetta
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* View Details for accepted */}
            {offer.status === "accepted" && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/centro/lavori`)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Gestisci Lavoro
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
                  <p className="text-2xl font-bold text-amber-700">{pendingOffers.length}</p>
                  <p className="text-xs text-amber-600">In Attesa</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{acceptedOffers.length}</p>
                  <p className="text-xs text-emerald-600">Accettati</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted-foreground/20 flex items-center justify-center">
                  <X className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">{declinedOffers.length}</p>
                  <p className="text-xs text-muted-foreground">Rifiutati/Scaduti</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Alert */}
          {pendingOffers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 border-2 border-amber-500 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 animate-pulse" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {pendingOffers.length} {pendingOffers.length === 1 ? "richiesta in attesa" : "richieste in attesa"} di risposta
                    </p>
                    <p className="text-sm text-amber-600">
                      Accetta o rifiuta le richieste prima che scadano
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
                In Attesa
                {pendingOffers.length > 0 && (
                  <Badge className="ml-1.5 h-5 px-1.5 bg-amber-500 text-white">
                    {pendingOffers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="accepted">Accettati</TabsTrigger>
              <TabsTrigger value="declined">Rifiutati</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pendingOffers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessuna richiesta in attesa</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Le nuove richieste dai Corner appariranno qui
                    </p>
                  </Card>
                ) : (
                  pendingOffers.map((offer) => renderOfferCard(offer, true))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="accepted" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {acceptedOffers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun lavoro accettato</p>
                  </Card>
                ) : (
                  acceptedOffers.map((offer) => renderOfferCard(offer, false))
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="declined" className="space-y-3">
              <AnimatePresence mode="popLayout">
                {declinedOffers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <X className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun lavoro rifiutato</p>
                  </Card>
                ) : (
                  declinedOffers.map((offer) => renderOfferCard(offer, false))
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </CentroLayout>
  );
}
