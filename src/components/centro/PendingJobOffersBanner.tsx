import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Euro, Smartphone, Store, Wrench, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PendingCornerRequest {
  id: string;
  created_at: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  estimated_cost: number | null;
  customer: {
    name: string;
    phone: string;
  };
  corner: {
    business_name: string;
  } | null;
}

interface PendingJobOffersBannerProps {
  centroId: string;
}

export function PendingJobOffersBanner({ centroId }: PendingJobOffersBannerProps) {
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<PendingCornerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingRequests = async () => {
    // Fetch repair_requests assigned to this Centro from Corners with status "assigned" or "pending"
    const { data, error } = await supabase
      .from("repair_requests")
      .select(`
        id,
        created_at,
        device_type,
        device_brand,
        device_model,
        issue_description,
        estimated_cost,
        customer:customers (
          name,
          phone
        ),
        corner:corners (
          business_name
        )
      `)
      .eq("assigned_provider_type", "centro")
      .eq("assigned_provider_id", centroId)
      .not("corner_id", "is", null)
      .in("status", ["assigned", "pending"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingRequests(data as unknown as PendingCornerRequest[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPendingRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("centro-pending-requests-banner")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_requests",
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  const handleStartWork = async (request: PendingCornerRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("repair_requests")
        .update({ status: "in_progress" })
        .eq("id", request.id);

      if (error) throw error;

      toast.success("Lavoro iniziato!", {
        description: "Il cliente è stato notificato.",
      });

      // Remove from list
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (error: any) {
      console.error("Error starting work:", error);
      toast.error("Errore nell'avviare il lavoro");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || pendingRequests.length === 0) return null;

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
            {pendingRequests.length} {pendingRequests.length === 1 ? "Nuovo lavoro da Corner" : "Nuovi lavori da Corner"}
          </span>
        </div>

        {pendingRequests.map((request, index) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 border-2 border-amber-500 bg-amber-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-amber-100">
                    <Smartphone className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Store className="h-3 w-3 mr-1" />
                        {request.corner?.business_name || "Corner"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), "dd/MM HH:mm", { locale: it })}
                      </span>
                    </div>
                    <p className="font-semibold mt-1">
                      {request.device_brand} {request.device_model || request.device_type}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {request.issue_description}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        {request.customer.name} • {request.customer.phone}
                      </span>
                      {request.estimated_cost && (
                        <span className="font-medium text-emerald-600 flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          {request.estimated_cost}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/centro/lavori-corner")}
                  >
                    Dettagli
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleStartWork(request)}
                    disabled={processingId === request.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processingId === request.id ? (
                      "Elaborazione..."
                    ) : (
                      <>
                        <Wrench className="h-4 w-4 mr-1" />
                        Inizia
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
