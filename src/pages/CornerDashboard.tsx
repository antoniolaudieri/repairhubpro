import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CornerLayout } from "@/layouts/CornerLayout";
import { RepairRequestsList } from "@/components/corner/RepairRequestsList";
import { CommissionHistory } from "@/components/corner/CommissionHistory";
import { PageTransition } from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PendingQuotesBanner } from "@/components/corner/PendingQuotesBanner";
import { CreditBalanceWidget } from "@/components/credit/CreditBalanceWidget";
import { CreditStatusBanner } from "@/components/credit/CreditStatusBanner";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Users,
  CalendarCheck
} from "lucide-react";
import { motion } from "framer-motion";

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
  const [pendingAppointments, setPendingAppointments] = useState(0);
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

        // Fetch pending appointments count
        const { count } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("corner_id", cornerData.id)
          .eq("status", "pending");

        setPendingAppointments(count || 0);
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
    pendingRequests: requests.filter((r) => r.status === "pending" || r.status === "dispatched" || r.status === "assigned").length,
    completedRequests: requests.filter((r) => r.status === "delivered" || r.status === "completed").length,
    totalCommissions: commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0),
  };

  const statsCards = [
    {
      title: "Segnalazioni",
      value: stats.totalRequests,
      icon: FileText,
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "In Attesa",
      value: stats.pendingRequests,
      icon: Clock,
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "Completate",
      value: stats.completedRequests,
      icon: CheckCircle2,
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "Guadagni",
      value: `€${stats.totalCommissions.toFixed(2)}`,
      icon: TrendingUp,
      iconBg: "bg-gradient-to-br from-violet-500 to-purple-500",
      onClick: () => navigate("/corner/commissioni"),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (!corner && !isLoading) {
    return (
      <CornerLayout>
        <PageTransition>
          <div className="flex items-center justify-center h-full min-h-[60vh]">
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
          <div className="flex items-center justify-center h-full min-h-[60vh]">
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

  if (isLoading) {
    return (
      <CornerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
            <p className="text-muted-foreground text-sm mt-3">Caricamento...</p>
          </motion.div>
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-4 md:space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">{corner?.business_name}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Gestisci le tue segnalazioni</p>
            </div>
            <Button
              onClick={() => navigate("/corner/nuova-segnalazione")}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuova Segnalazione</span>
            </Button>
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

          {/* Stats Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4"
          >
            {statsCards.map((card) => (
              <motion.div key={card.title} variants={itemVariants}>
                <Card 
                  className="p-3 md:p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-border/50 hover:border-border"
                  onClick={card.onClick}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={`h-8 w-8 md:h-10 md:w-10 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <card.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base md:text-xl font-bold text-foreground leading-none">{card.value}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{card.title}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Secondary Stats */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
          >
            {/* Credit Balance Widget */}
            {corner && (
              <motion.div variants={itemVariants}>
                <CreditBalanceWidget
                  entityType="corner"
                  entityId={corner.id}
                  creditBalance={corner.credit_balance || 0}
                  warningThreshold={corner.credit_warning_threshold || 50}
                  paymentStatus={corner.payment_status || "good_standing"}
                  onTopupSuccess={fetchCornerData}
                />
              </motion.div>
            )}

            {/* Pending Appointments Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className="p-3 md:p-4 border-border/50 hover:border-border transition-colors cursor-pointer h-full"
                onClick={() => navigate("/corner/prenotazioni")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                    <CalendarCheck className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base md:text-xl font-bold text-foreground leading-none">{pendingAppointments}</p>
                      {pendingAppointments > 0 && (
                        <Badge className="bg-orange-500 text-white text-[10px]">Nuove</Badge>
                      )}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Prenotazioni in attesa</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Customers Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className="p-3 md:p-4 border-border/50 hover:border-border transition-colors cursor-pointer h-full"
                onClick={() => navigate("/corner/segnalazioni")}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base md:text-xl font-bold text-foreground leading-none">{requests.length}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Clienti segnalati</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Tabs Content */}
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