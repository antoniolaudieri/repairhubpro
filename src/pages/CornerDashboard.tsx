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

  // Calculate stats - include all commissions not just paid
  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === "pending" || r.status === "dispatched" || r.status === "assigned").length,
    completedRequests: requests.filter((r) => r.status === "delivered" || r.status === "completed").length,
    totalCommissions: commissions
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
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/90 via-primary to-primary/80 p-6 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNC0yLTItNCAyLTQgMi00cy0yLTItNC0yIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative">
              <h1 className="text-2xl md:text-3xl font-bold">Benvenuto, {corner?.business_name}</h1>
              <p className="text-white/80 mt-1">
                Gestisci le tue segnalazioni e monitora le commissioni
              </p>
            </div>
          </div>

          {/* Pending Quotes Banner */}
          <PendingQuotesBanner />

          <CornerStats {...stats} />

          {/* CTA Button */}
          <Button
            onClick={() => navigate("/corner/nuova-segnalazione")}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nuova Segnalazione
          </Button>

          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Segnalazioni
              </TabsTrigger>
              <TabsTrigger value="commissions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Commissioni
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4">
              <RepairRequestsList requests={requests} isLoading={isLoading} onRefresh={fetchCornerData} />
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
