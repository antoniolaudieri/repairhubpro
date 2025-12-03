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
  Sparkles,
  Zap,
  ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";

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
      gradient: "from-amber-500 to-orange-500",
      bgLight: "bg-gradient-to-br from-amber-500/15 to-orange-500/10",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      onClick: () => navigate("/repairs?status=pending"),
    },
    {
      title: "In Lavorazione",
      value: stats.inProgressRepairs,
      icon: Wrench,
      gradient: "from-blue-500 to-cyan-500",
      bgLight: "bg-gradient-to-br from-blue-500/15 to-cyan-500/10",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      onClick: () => navigate("/repairs?status=in_progress"),
    },
    {
      title: "Completate Oggi",
      value: stats.completedToday,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bgLight: "bg-gradient-to-br from-emerald-500/15 to-teal-500/10",
      iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",
      onClick: () => navigate("/repairs?status=completed"),
    },
    {
      title: "Scorte Basse",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      gradient: "from-red-500 to-rose-500",
      bgLight: "bg-gradient-to-br from-red-500/15 to-rose-500/10",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-500",
      onClick: () => navigate("/inventory?low_stock=true"),
    },
    {
      title: "In Scadenza",
      value: stats.forfeitureWarnings,
      icon: Clock,
      gradient: "from-rose-600 to-rose-800",
      bgLight: "bg-gradient-to-br from-rose-600/15 to-rose-800/10",
      iconBg: "bg-gradient-to-br from-rose-600 to-rose-800",
      onClick: () => navigate("/repairs?status=completed"),
      highlight: stats.forfeitureWarnings > 0,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Zap className="h-8 w-8 text-primary" />
            </motion.div>
          </div>
          <p className="text-muted-foreground font-medium mt-4">Caricamento dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl animate-float-medium" />
        <div className="absolute bottom-20 right-1/4 w-40 h-40 bg-info/5 rounded-full blur-2xl animate-float-slow" />
      </div>

      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-card/80 via-card to-primary/5 border-b border-border/30 backdrop-blur-sm">
        <div className="absolute inset-0 bg-pattern-dots opacity-30" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
          >
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mb-2"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                  Dashboard
                </h1>
              </motion.div>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground text-lg"
              >
                Panoramica delle riparazioni e del magazzino
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => navigate("/new-repair")}
                size="lg"
                className="gap-2 shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:scale-105 h-14 px-8 text-lg"
              >
                <Plus className="h-6 w-6" />
                Nuovo Ritiro
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative">
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />
        
        {/* Forfeiture Warning Alert */}
        {forfeitureWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Card className="p-5 glass-card border-rose-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-rose-900/5" />
              <div className="relative flex items-start gap-4">
                <motion.div 
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30"
                >
                  <AlertTriangle className="h-7 w-7 text-white" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="font-bold text-rose-800 flex items-center gap-2 text-lg">
                    Dispositivi in Scadenza
                    <Badge className="bg-rose-500 text-white shadow-md">{forfeitureWarnings.length}</Badge>
                  </h3>
                  <p className="text-sm text-rose-700/80 mb-4">
                    I seguenti dispositivi devono essere ritirati entro 7 giorni o verranno alienati.
                  </p>
                  <div className="space-y-2">
                    {forfeitureWarnings.slice(0, 5).map((warning, index) => (
                      <motion.div 
                        key={warning.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-background/60 backdrop-blur-sm cursor-pointer hover:bg-background/80 transition-all duration-200 group border border-rose-200/30"
                        onClick={() => navigate(`/repairs/${warning.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Smartphone className="h-5 w-5 text-rose-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {warning.device.brand} {warning.device.model}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {warning.customer.name} • {warning.customer.phone}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          className={`${warning.daysLeft <= 3 ? 'bg-rose-600 animate-pulse' : 'bg-rose-500'} text-white font-bold`}
                        >
                          {warning.daysLeft}g
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                  {forfeitureWarnings.length > 5 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-3 text-rose-700 hover:text-rose-800 hover:bg-rose-100"
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
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {statsCards.map((card, index) => (
            <motion.div key={card.title} variants={itemVariants}>
              <Card 
                className={`p-5 cursor-pointer transition-all duration-300 hover:scale-[1.03] group overflow-hidden relative border-0 shadow-lg hover:shadow-xl ${card.bgLight} ${card.highlight ? 'ring-2 ring-rose-500/50' : ''}`}
                onClick={card.onClick}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <div className="relative">
                  <motion.div 
                    className={`h-14 w-14 rounded-2xl ${card.iconBg} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <card.icon className="h-7 w-7 text-white" />
                  </motion.div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{card.title}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-bold text-foreground">{card.value}</p>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 group-hover:-translate-y-1" />
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25"
                >
                  <Users className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Clienti Totali</p>
                  <p className="text-3xl font-bold text-foreground">{stats.totalCustomers}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                >
                  <Euro className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Fatturato Totale</p>
                  <p className="text-3xl font-bold text-foreground">€{stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6 glass-card hover:shadow-xl transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
                >
                  <TrendingUp className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Riparazioni Attive</p>
                  <p className="text-3xl font-bold text-foreground">{stats.pendingRepairs + stats.inProgressRepairs}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Repairs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <Card className="overflow-hidden glass-card-strong border-0 shadow-xl">
              <div className="relative bg-gradient-to-r from-primary/15 via-primary/10 to-blue-500/5 px-6 py-5 border-b border-primary/10">
                <div className="absolute inset-0 bg-pattern-dots opacity-20" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/25">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Riparazioni Recenti</h2>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/repairs")}
                    className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Vedi tutte
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {recentRepairs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Wrench className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">Nessuna riparazione recente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentRepairs.map((repair, index) => {
                      const status = statusConfig[repair.status] || statusConfig.pending;
                      const DeviceIcon = getDeviceIcon(repair.device.device_type);
                      const StatusIcon = status.icon;
                      return (
                        <motion.div
                          key={repair.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.08 }}
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-border/50 hover:shadow-md"
                          onClick={() => navigate(`/repairs/${repair.id}`)}
                        >
                          {/* Device Image or Icon */}
                          <motion.div 
                            whileHover={{ scale: 1.1 }}
                            className="relative h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 shadow-md"
                          >
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
                            <DeviceIcon className={`h-7 w-7 text-primary ${repair.device.photo_url ? 'hidden' : ''}`} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {repair.device.brand} {repair.device.model}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {repair.customer.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${status.bg} ${status.text} border-0 flex items-center gap-1.5 px-3 py-1`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline font-medium">{status.label}</span>
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
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
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <Card className="overflow-hidden h-full glass-card-strong border-0 shadow-xl">
              <div className="relative bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/5 px-6 py-5 border-b border-emerald-200/20">
                <div className="absolute inset-0 bg-pattern-dots opacity-20" />
                <div className="relative flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Accesso Rapido</h2>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { icon: Wrench, label: "Gestione Riparazioni", path: "/repairs", gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/25" },
                  { icon: Users, label: "Clienti", path: "/customers", gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/25" },
                  { icon: Package, label: "Magazzino", path: "/inventory", gradient: "from-orange-500 to-amber-500", shadow: "shadow-orange-500/25" },
                  { icon: ShoppingCart, label: "Ordini Ricambi", path: "/orders", gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/25" },
                  { icon: Calendar, label: "Appuntamenti", path: "/appointments", gradient: "from-pink-500 to-rose-500", shadow: "shadow-pink-500/25" },
                ].map((item, index) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.08 }}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-16 font-medium hover:bg-muted/50 group rounded-2xl border border-transparent hover:border-border/50 transition-all duration-300"
                      onClick={() => navigate(item.path)}
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mr-4 shadow-lg ${item.shadow}`}
                      >
                        <item.icon className="h-6 w-6 text-white" />
                      </motion.div>
                      <span className="flex-1 text-left text-base">{item.label}</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
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
