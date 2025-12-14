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
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  Users,
  CalendarCheck,
  Euro,
  ChevronRight,
  Sparkles,
  Package
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Corner {
  id: string;
  business_name: string;
  status: string;
  credit_balance: number;
  credit_warning_threshold: number;
  payment_status: string;
}

interface ChartData {
  label: string;
  segnalazioni: number;
  completate: number;
  guadagni: number;
}

export default function CornerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [corner, setCorner] = useState<Corner | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState(0);
  const [adRevenue, setAdRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<ChartData[]>([]);

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

        // Fetch advertising revenue
        const { data: adRevenueData } = await supabase
          .from("display_ad_campaign_corners")
          .select("corner_revenue")
          .eq("corner_id", cornerData.id);

        const totalAdRevenue = adRevenueData?.reduce((sum, item) => sum + (item.corner_revenue || 0), 0) || 0;
        setAdRevenue(totalAdRevenue);

        // Load weekly chart data
        await loadWeeklyData(cornerData.id);
      }
    } catch (error: any) {
      console.error("Error fetching corner data:", error);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  };

  const loadWeeklyData = async (cornerId: string) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);

    const { data: requests } = await supabase
      .from("repair_requests")
      .select("created_at, status, delivered_at")
      .eq("corner_id", cornerId)
      .gte("created_at", startDate.toISOString());

    const { data: commissions } = await supabase
      .from("commission_ledger")
      .select("created_at, corner_commission")
      .eq("corner_id", cornerId)
      .gte("created_at", startDate.toISOString());

    const weekData: ChartData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      
      const created = requests?.filter(r => r.created_at.startsWith(dateStr)).length || 0;
      const completed = requests?.filter(r => r.delivered_at?.startsWith(dateStr)).length || 0;
      const earnings = commissions?.filter(c => c.created_at.startsWith(dateStr))
        .reduce((sum, c) => sum + (c.corner_commission || 0), 0) || 0;
      
      weekData.push({
        label: dayName,
        segnalazioni: created,
        completate: completed,
        guadagni: Math.round(earnings * 100) / 100
      });
    }
    setWeeklyData(weekData);
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
  const gestioneFeesCollected = requests.filter(r => r.corner_gestione_fee_enabled && r.corner_gestione_fee_collected).length;
  const gestioneFeesTotal = requests
    .filter(r => r.corner_gestione_fee_enabled && r.corner_gestione_fee_collected)
    .reduce((sum, r) => sum + (r.corner_gestione_fee || 15), 0);
    
  const totalRepairCommissions = commissions.reduce((sum, c) => sum + (c.corner_commission || 0), 0);
  const totalEarnings = totalRepairCommissions + adRevenue;

  const stats = {
    totalRequests: requests.length,
    pendingRequests: requests.filter((r) => r.status === "pending" || r.status === "dispatched" || r.status === "assigned").length,
    completedRequests: requests.filter((r) => r.status === "delivered" || r.status === "completed").length,
    totalCommissions: totalRepairCommissions,
    totalEarnings,
    adRevenue,
    thisMonthCommissions: commissions
      .filter(c => {
        const date = new Date(c.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, c) => sum + (c.corner_commission || 0), 0),
    gestioneFeesCollected,
    gestioneFeesTotal,
  };

  const statsCards = [
    {
      title: "Segnalazioni",
      value: stats.totalRequests,
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      bgLight: "bg-gradient-to-br from-blue-500/15 to-cyan-500/10",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "In Attesa",
      value: stats.pendingRequests,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgLight: "bg-gradient-to-br from-amber-500/15 to-orange-500/10",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "Completate",
      value: stats.completedRequests,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bgLight: "bg-gradient-to-br from-emerald-500/15 to-teal-500/10",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
      onClick: () => navigate("/corner/segnalazioni"),
    },
    {
      title: "Guadagni Totali",
      value: `€${stats.totalEarnings.toFixed(2)}`,
      subtitle: stats.adRevenue > 0 ? `incl. €${stats.adRevenue.toFixed(2)} pubblicità` : undefined,
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-500",
      bgLight: "bg-gradient-to-br from-violet-500/15 to-purple-500/10",
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 p-6"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Account Corner Non Trovato</h2>
              <p className="text-muted-foreground max-w-md">
                Il tuo account corner non è stato ancora approvato o non esiste.
              </p>
            </motion.div>
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 p-6"
            >
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center mx-auto animate-pulse">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold">Account in Attesa di Approvazione</h2>
              <p className="text-muted-foreground max-w-md">
                La tua richiesta di registrazione come Corner è in fase di revisione.
                <br />
                Riceverai una notifica quando sarà approvata.
              </p>
            </motion.div>
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
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/20 border-t-primary mx-auto" />
              <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
            </div>
            <p className="text-muted-foreground text-sm mt-4">Caricamento dashboard...</p>
          </motion.div>
        </div>
      </CornerLayout>
    );
  }

  return (
    <CornerLayout>
      <PageTransition>
        <div className="space-y-4 md:space-y-6">
          {/* Hero Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 md:p-6 text-primary-foreground"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTItNC0yLTQtMi00IDItNCAyLTIgNCAyIDQgMiA0IDQgMiA0IDIgNC0yIDQtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-white/80" />
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Dashboard Corner</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold">{corner?.business_name}</h1>
                <p className="text-sm text-white/70">Gestisci le tue segnalazioni e guadagni</p>
              </div>
              <Button
                onClick={() => navigate("/corner/nuova-segnalazione")}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm gap-2 shadow-lg"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                <span>Nuova Segnalazione</span>
              </Button>
            </div>

            {/* Quick Stats in Header */}
            <div className="relative mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl md:text-3xl font-bold">{stats.totalRequests}</p>
                <p className="text-xs text-white/70">Segnalazioni</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl md:text-3xl font-bold">{stats.completedRequests}</p>
                <p className="text-xs text-white/70">Completate</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl md:text-3xl font-bold">€{stats.adRevenue.toFixed(2)}</p>
                <p className="text-xs text-white/70">Pubblicità</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-2xl md:text-3xl font-bold">€{stats.thisMonthCommissions.toFixed(2)}</p>
                <p className="text-xs text-white/70">Commissioni</p>
              </div>
            </div>
          </motion.div>

          {/* Pending Quotes Banner */}
          <PendingQuotesBanner />

          {/* Stats Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          >
            {statsCards.map((card) => (
              <motion.div key={card.title} variants={itemVariants}>
                <Card 
                  className="p-3 md:p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/50 hover:border-primary/30 group overflow-hidden relative"
                  onClick={card.onClick}
                >
                  {/* Subtle gradient background on hover */}
                  <div className={`absolute inset-0 ${card.bgLight} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  <div className="relative flex items-center gap-2 md:gap-3">
                    <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                      <card.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{card.value}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{card.title}</p>
                      {(card as any).subtitle && (
                        <p className="text-[9px] text-primary/70 mt-0.5">{(card as any).subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Secondary Stats Row */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
          >
            {/* Pending Appointments Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className="p-4 border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer group hover:shadow-lg"
                onClick={() => navigate("/corner/prenotazioni")}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <CalendarCheck className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground leading-none">{pendingAppointments}</p>
                      {pendingAppointments > 0 && (
                        <Badge className="bg-orange-500 text-white text-[10px] animate-pulse">Nuove</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Prenotazioni in attesa</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </motion.div>

            {/* Customers Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className="p-4 border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer group hover:shadow-lg"
                onClick={() => navigate("/corner/segnalazioni")}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-foreground leading-none">{requests.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Clienti segnalati</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </motion.div>

            {/* Used Devices Card */}
            <motion.div variants={itemVariants}>
              <Card 
                className="p-4 border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer group hover:shadow-lg"
                onClick={() => navigate("/corner/usato")}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-foreground leading-none">Usato</p>
                    <p className="text-xs text-muted-foreground mt-1">Gestisci dispositivi</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Weekly Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4 md:p-6 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">Andamento Settimanale</h3>
                  <p className="text-xs text-muted-foreground">Ultimi 7 giorni</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Segnalazioni</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Completate</span>
                  </div>
                </div>
              </div>
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSegnalazioni" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="segnalazioni" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSegnalazioni)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCompletate)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* Tabs Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Tabs defaultValue="requests" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-auto">
                <TabsTrigger 
                  value="requests" 
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 text-sm font-medium"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Segnalazioni
                </TabsTrigger>
                <TabsTrigger 
                  value="commissions" 
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 text-sm font-medium"
                >
                  <Euro className="h-4 w-4 mr-2" />
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
          </motion.div>
        </div>
      </PageTransition>
    </CornerLayout>
  );
}
