import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Smartphone, 
  Wrench, 
  Package, 
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Euro,
  Activity,
  Tablet,
  Laptop,
  Watch,
  Monitor,
  Gamepad2,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface RecentRepair {
  id: string;
  status: string;
  created_at: string;
  device: {
    brand: string;
    model: string;
    photo_url: string | null;
    device_type: string;
  };
  customer: {
    name: string;
  };
}

interface ForfeitureWarning {
  id: string;
  completed_at: string;
  daysLeft: number;
  device: {
    brand: string;
    model: string;
  };
  customer: {
    name: string;
    phone: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingRepairs: 0,
    inProgressRepairs: 0,
    completedToday: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    forfeitureWarnings: 0,
  });
  const [recentRepairs, setRecentRepairs] = useState<RecentRepair[]>([]);
  const [forfeitureWarnings, setForfeitureWarnings] = useState<ForfeitureWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRecentRepairs();
    loadForfeitureWarnings();
  }, []);

  const loadStats = async () => {
    const { data: repairs } = await supabase
      .from("repairs")
      .select("status, created_at, final_cost, completed_at, delivered_at");

    const { data: spareParts } = await supabase
      .from("spare_parts")
      .select("stock_quantity, minimum_stock");

    const { count: customerCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    const pending = repairs?.filter((r) => r.status === "pending").length || 0;
    const inProgress = repairs?.filter((r) => r.status === "in_progress").length || 0;
    
    const today = new Date().toISOString().split("T")[0];
    const completedToday = repairs?.filter(
      (r) => r.status === "completed" && r.created_at?.startsWith(today)
    ).length || 0;

    const lowStock = spareParts?.filter(
      (sp) => sp.stock_quantity <= sp.minimum_stock
    ).length || 0;

    const totalRevenue = repairs?.reduce((sum, r) => sum + (r.final_cost || 0), 0) || 0;

    // Count forfeiture warnings (completed but not delivered, 23+ days)
    const now = new Date();
    const forfeitureCount = repairs?.filter((r) => {
      if (r.status !== "completed" || r.delivered_at || !r.completed_at) return false;
      const completedAt = new Date(r.completed_at);
      const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCompletion >= 23;
    }).length || 0;

    setStats({
      pendingRepairs: pending,
      inProgressRepairs: inProgress,
      completedToday,
      lowStockItems: lowStock,
      totalCustomers: customerCount || 0,
      totalRevenue,
      forfeitureWarnings: forfeitureCount,
    });
    setLoading(false);
  };

  const loadForfeitureWarnings = async () => {
    const { data } = await supabase
      .from("repairs")
      .select(`
        id,
        completed_at,
        delivered_at,
        status,
        device:devices (
          brand,
          model,
          customer:customers (
            name,
            phone
          )
        )
      `)
      .eq("status", "completed")
      .is("delivered_at", null)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true });

    if (data) {
      const now = new Date();
      const warnings = data
        .map((r: any) => {
          const completedAt = new Date(r.completed_at);
          const daysSinceCompletion = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
          const daysLeft = 30 - daysSinceCompletion;
          return {
            id: r.id,
            completed_at: r.completed_at,
            daysLeft,
            device: {
              brand: r.device.brand,
              model: r.device.model,
            },
            customer: r.device.customer,
          };
        })
        .filter((r: ForfeitureWarning) => r.daysLeft <= 7 && r.daysLeft > 0)
        .sort((a: ForfeitureWarning, b: ForfeitureWarning) => a.daysLeft - b.daysLeft);

      setForfeitureWarnings(warnings);
    }
  };

  const loadRecentRepairs = async () => {
    const { data } = await supabase
      .from("repairs")
      .select(`
        id,
        status,
        created_at,
        device:devices (
          brand,
          model,
          photo_url,
          device_type,
          customer:customers (
            name
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) {
      setRecentRepairs(data.map((r: any) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        device: {
          brand: r.device.brand,
          model: r.device.model,
          photo_url: r.device.photo_url,
          device_type: r.device.device_type,
        },
        customer: r.device.customer,
      })));
    }
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string; icon: typeof Clock }> = {
    pending: { label: "In attesa", bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
    in_progress: { label: "In corso", bg: "bg-blue-100", text: "text-blue-700", icon: Wrench },
    waiting_parts: { label: "Attesa ricambi", bg: "bg-orange-100", text: "text-orange-700", icon: Package },
    completed: { label: "Completata", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
    cancelled: { label: "Annullata", bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
    forfeited: { label: "Alienato", bg: "bg-rose-100", text: "text-rose-900", icon: AlertTriangle },
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'tablet': return Tablet;
      case 'laptop': return Laptop;
      case 'smartwatch': return Watch;
      case 'console': return Gamepad2;
      case 'pc': return Monitor;
      default: return Smartphone;
    }
  };

  const statsCards = [
    {
      title: "In Attesa",
      value: stats.pendingRepairs,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-500/10",
      textColor: "text-amber-600",
      onClick: () => navigate("/repairs?status=pending"),
    },
    {
      title: "In Lavorazione",
      value: stats.inProgressRepairs,
      icon: Wrench,
      color: "from-blue-500 to-cyan-500",
      bgLight: "bg-blue-500/10",
      textColor: "text-blue-600",
      onClick: () => navigate("/repairs?status=in_progress"),
    },
    {
      title: "Completate Oggi",
      value: stats.completedToday,
      icon: CheckCircle2,
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      onClick: () => navigate("/repairs?status=completed"),
    },
    {
      title: "Scorte Basse",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: "from-red-500 to-rose-500",
      bgLight: "bg-red-500/10",
      textColor: "text-red-600",
      onClick: () => navigate("/inventory?low_stock=true"),
    },
    {
      title: "In Scadenza",
      value: stats.forfeitureWarnings,
      icon: Clock,
      color: "from-rose-700 to-rose-900",
      bgLight: "bg-rose-900/10",
      textColor: "text-rose-900",
      onClick: () => navigate("/repairs?status=completed"),
      highlight: stats.forfeitureWarnings > 0,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Caricamento dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-card via-card to-primary/5 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Panoramica delle riparazioni e del magazzino
              </p>
            </div>
            <Button
              onClick={() => navigate("/new-repair")}
              size="lg"
              className="gap-2 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90"
            >
              <Plus className="h-5 w-5" />
              Nuovo Ritiro
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Forfeiture Warning Alert */}
        {forfeitureWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-gradient-to-r from-rose-500/10 to-rose-900/5 border-rose-500/30">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-rose-900 flex items-center gap-2">
                    ⚠️ Dispositivi in Scadenza
                    <Badge className="bg-rose-500 text-white">{forfeitureWarnings.length}</Badge>
                  </h3>
                  <p className="text-sm text-rose-700 mb-3">
                    I seguenti dispositivi devono essere ritirati entro 7 giorni o verranno alienati.
                  </p>
                  <div className="space-y-2">
                    {forfeitureWarnings.slice(0, 5).map((warning) => (
                      <div 
                        key={warning.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-background/50 cursor-pointer hover:bg-background transition-colors"
                        onClick={() => navigate(`/repairs/${warning.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-4 w-4 text-rose-600" />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {warning.device.brand} {warning.device.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {warning.customer.name} - {warning.customer.phone}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`${warning.daysLeft <= 3 ? 'bg-rose-600 animate-pulse' : 'bg-rose-500'} text-white`}
                        >
                          {warning.daysLeft}g rimasti
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {forfeitureWarnings.length > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-rose-700"
                      onClick={() => navigate("/repairs?status=completed")}
                    >
                      Vedi tutti ({forfeitureWarnings.length})
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group overflow-hidden relative border-border/50"
                onClick={card.onClick}
              >
                <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity">
                  <card.icon className="w-full h-full" />
                </div>
                
                <div className="relative">
                  <div className={`h-12 w-12 rounded-xl ${card.bgLight} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <card.icon className={`h-6 w-6 ${card.textColor}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                </div>

                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className={`h-5 w-5 ${card.textColor}`} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-purple-500/5 border-violet-200/30">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <Users className="h-7 w-7 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clienti Totali</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalCustomers}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-200/30">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <Euro className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fatturato Totale</p>
                  <p className="text-2xl font-bold text-foreground">€{stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-200/30">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Riparazioni Attive</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingRepairs + stats.inProgressRepairs}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Repairs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-blue-500/5 px-6 py-4 border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-primary" />
                    </div>
                    Riparazioni Recenti
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/repairs")}
                    className="gap-1 text-primary hover:text-primary"
                  >
                    Vedi tutte
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {recentRepairs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Wrench className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Nessuna riparazione recente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRepairs.map((repair, index) => {
                      const status = statusConfig[repair.status] || statusConfig.pending;
                      const DeviceIcon = getDeviceIcon(repair.device.device_type);
                      const StatusIcon = status.icon;
                      return (
                        <motion.div
                          key={repair.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.05 }}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer group hover:shadow-md"
                          onClick={() => navigate(`/repairs/${repair.id}`)}
                        >
                          {/* Device Image or Icon */}
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            {repair.device.photo_url ? (
                              <img 
                                src={repair.device.photo_url} 
                                alt={`${repair.device.brand} ${repair.device.model}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <DeviceIcon className={`h-6 w-6 text-primary ${repair.device.photo_url ? 'hidden' : ''}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {repair.device.brand} {repair.device.model}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {repair.customer.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${status.bg} ${status.text} border-0 flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              <span className="hidden sm:inline">{status.label}</span>
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="overflow-hidden h-full">
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 px-6 py-4 border-b border-emerald-200/30">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  Accesso Rapido
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { icon: Wrench, label: "Gestione Riparazioni", path: "/repairs", color: "text-blue-600", bg: "bg-blue-500/10" },
                  { icon: Users, label: "Clienti", path: "/customers", color: "text-violet-600", bg: "bg-violet-500/10" },
                  { icon: Package, label: "Magazzino", path: "/inventory", color: "text-orange-600", bg: "bg-orange-500/10" },
                  { icon: ShoppingCart, label: "Ordini Ricambi", path: "/orders", color: "text-emerald-600", bg: "bg-emerald-500/10" },
                  { icon: Calendar, label: "Appuntamenti", path: "/appointments", color: "text-pink-600", bg: "bg-pink-500/10" },
                ].map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-14 font-medium hover:bg-muted/50 group"
                      onClick={() => navigate(item.path)}
                    >
                      <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
