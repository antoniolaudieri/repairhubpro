import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, ChevronRight, Euro, Smartphone, CheckCircle2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface PendingJobOffer {
  id: string;
  expires_at: string;
  repair_request: {
    id: string;
    device_type: string;
    device_brand: string | null;
    device_model: string | null;
    issue_description: string;
    estimated_cost: number | null;
    corner: {
      business_name: string;
    } | null;
  };
}

interface PendingJobOffersBannerProps {
  centroId: string;
}

export function PendingJobOffersBanner({ centroId }: PendingJobOffersBannerProps) {
  const navigate = useNavigate();
  const [pendingOffers, setPendingOffers] = useState<PendingJobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchPendingOffers = async () => {
    const { data, error } = await supabase
      .from("job_offers")
      .select(`
        id,
        expires_at,
        repair_request:repair_requests (
          id,
          device_type,
          device_brand,
          device_model,
          issue_description,
          estimated_cost,
          corner:corners (
            business_name
          )
        )
      `)
      .eq("provider_type", "centro")
      .eq("provider_id", centroId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingOffers(data as unknown as PendingJobOffer[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPendingOffers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("centro-pending-offers-banner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_offers",
        },
        () => {
          fetchPendingOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  const handleAcceptOffer = async (offer: PendingJobOffer) => {
    setAcceptingId(offer.id);
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
        description: "Ora puoi emettere il preventivo per il cliente.",
      });

      // Remove from list
      setPendingOffers((prev) => prev.filter((o) => o.id !== offer.id));

      // Navigate to lavori
      navigate("/centro/lavori");
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      toast.error("Errore nell'accettare il lavoro");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineOffer = async (offer: PendingJobOffer) => {
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
      setPendingOffers((prev) => prev.filter((o) => o.id !== offer.id));
    } catch (error: any) {
      console.error("Error declining offer:", error);
      toast.error("Errore nel rifiutare il lavoro");
    }
  };

  if (isLoading || pendingOffers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="h-5 w-5 animate-pulse" />
          <span className="font-semibold">
            {pendingOffers.length} {pendingOffers.length === 1 ? "Nuovo lavoro in attesa" : "Nuovi lavori in attesa"}
          </span>
        </div>

        {pendingOffers.map((offer, index) => {
          const expiresAt = new Date(offer.expires_at);
          const isExpiringSoon = expiresAt.getTime() - Date.now() < 5 * 60 * 1000; // Less than 5 minutes

          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-4 border-2 ${isExpiringSoon ? "border-red-500 bg-red-50/50" : "border-amber-500 bg-amber-50/50"}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isExpiringSoon ? "bg-red-100" : "bg-amber-100"}`}>
                      <Smartphone className={`h-6 w-6 ${isExpiringSoon ? "text-red-600" : "text-amber-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          Da: {offer.repair_request.corner?.business_name || "Corner"}
                        </Badge>
                        <Badge variant="outline" className={`${isExpiringSoon ? "border-red-500 text-red-600" : "border-amber-500 text-amber-600"}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          Scade {formatDistanceToNow(expiresAt, { addSuffix: true, locale: it })}
                        </Badge>
                      </div>
                      <p className="font-semibold mt-1">
                        {offer.repair_request.device_brand} {offer.repair_request.device_model || offer.repair_request.device_type}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {offer.repair_request.issue_description}
                      </p>
                      {offer.repair_request.estimated_cost && (
                        <p className="text-sm font-medium text-emerald-600 mt-1 flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          Stima: €{offer.repair_request.estimated_cost}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineOffer(offer)}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rifiuta
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptOffer(offer)}
                      disabled={acceptingId === offer.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {acceptingId === offer.id ? (
                        "Accettando..."
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Accetta
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
