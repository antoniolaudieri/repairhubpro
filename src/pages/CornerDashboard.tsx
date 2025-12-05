import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CornerLayout } from "@/layouts/CornerLayout";
import { CornerStats } from "@/components/corner/CornerStats";
import { RepairRequestsList } from "@/components/corner/RepairRequestsList";
import { CommissionHistory } from "@/components/corner/CommissionHistory";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditBalanceWidget } from "@/components/credit/CreditBalanceWidget";
import { CreditStatusBanner } from "@/components/credit/CreditStatusBanner";
import { PendingQuotesBanner } from "@/components/corner/PendingQuotesBanner";
import { Plus } from "lucide-react";

interface Corner {
  id: string;
  business_name: string;
  status: string;
  credit_balance: number;
  credit_warning_threshold: number;
  payment_status: string;
}

export default function CornerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [corner, setCorner] = useState<Corner | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCornerData = async () => {
    if (!user) return;

    try {
      // Fetch corner profile
      const { data: cornerData, error: cornerError } = await supabase
        .from("corners")
        .select("id, business_name, status, credit_balance, credit_warning_threshold, payment_status")
        .eq("user_id", user.id)
        .single();

      if (cornerError) throw cornerError;
      setCorner(cornerData);

      if (cornerData) {
        // Fetch repair requests
        const { data: requestsData, error: requestsError } = await supabase
          .from("repair_requests")
          .select(`
            *,
            customers (name, phone)
          `)
          .eq("corner_id", cornerData.id)
          .order("created_at", { ascending: false });

        if (requestsError) throw requestsError;
        setRequests(requestsData || []);

        // Fetch commissions
        const { data: commissionsData, error: commissionsError } = await supabase
          .from("commission_ledger")
          .select("*")
          .eq("corner_id", cornerData.id)
          .order("created_at", { ascending: false });

        if (commissionsError) throw commissionsError;
        setCommissions(commissionsData || []);
      }
    } catch (error: any) {
      console.error("Error fetching corner data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCornerData();
  }, [user]);

  // Set up realtime subscription for repair_requests updates
  useEffect(() => {
    if (!corner) return;

    const channel = supabase
      .channel("corner-repair-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "repair_requests",
          filter: `corner_id=eq.${corner.id}`,
        },
        (payload) => {
          console.log("Repair request updated:", payload);
          fetchCornerData();
          if (payload.eventType === "UPDATE" && payload.new) {
            const newStatus = (payload.new as any).status;
            if (newStatus === "assigned") {
              toast.success("La tua segnalazione è stata assegnata a un riparatore!");
            } else if (newStatus === "completed") {
              toast.success("Riparazione completata! Commissione in arrivo.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [corner]);

  // Calculate stats
  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === "pending" || r.status === "dispatched").length,
    completedRequests: requests.filter((r) => r.status === "completed").length,
    totalCommissions: commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.corner_commission || 0), 0),
  };

  if (!corner && !isLoading) {
    return (
      <CornerLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Account Corner Non Trovato</h2>
              <p className="text-muted-foreground">
                Il tuo account corner non è stato ancora approvato o non esiste.
              </p>
            </div>
          </div>
        </PageTransition>
      </CornerLayout>
    );
  }

  if (corner?.status !== "approved" && !isLoading) {
    return (
      <CornerLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Account in Attesa di Approvazione</h2>
              <p className="text-muted-foreground">
                La tua richiesta di registrazione come Corner è in fase di revisione.
                <br />
                Riceverai una notifica quando sarà approvata.
              </p>
            </div>
          </div>
        </PageTransition>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Benvenuto, {corner?.business_name}</h1>
            <p className="text-muted-foreground">
              Gestisci le tue segnalazioni e monitora le commissioni
            </p>
          </div>

          {/* Credit Status Banner */}
          {corner && (corner.payment_status === "warning" || corner.payment_status === "suspended") && (
            <CreditStatusBanner
              paymentStatus={corner.payment_status || "good_standing"}
              creditBalance={corner.credit_balance || 0}
            />
          )}

          {/* Pending Quotes Banner */}
          <PendingQuotesBanner />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Credit Balance Widget */}
            {corner && (
              <CreditBalanceWidget
                entityType="corner"
                entityId={corner.id}
                creditBalance={corner.credit_balance || 0}
                warningThreshold={corner.credit_warning_threshold || 50}
                paymentStatus={corner.payment_status || "good_standing"}
                onTopupSuccess={fetchCornerData}
              />
            )}
            <div className="md:col-span-3">
              <CornerStats {...stats} />
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/corner/nuova-segnalazione")}
            disabled={corner?.payment_status === "suspended"}
            className="w-full md:w-auto"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuova Segnalazione
          </Button>

          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requests">Segnalazioni</TabsTrigger>
              <TabsTrigger value="commissions">Commissioni</TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4">
              <RepairRequestsList requests={requests} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="commissions" className="mt-4">
              <CommissionHistory commissions={commissions} isLoading={isLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
