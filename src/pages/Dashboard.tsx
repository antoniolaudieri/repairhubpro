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
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface WeeklyData {
  day: string;
  riparazioni: number;
  completate: number;
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
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadRecentRepairs();
    loadForfeitureWarnings();
    loadWeeklyData();
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

  const loadWeeklyData = async () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);

    const { data: repairs } = await supabase
      .from("repairs")
      .select("created_at, status, completed_at")
      .gte("created_at", weekAgo.toISOString());

    const weekData: WeeklyData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      
      const created = repairs?.filter(r => r.created_at.startsWith(dateStr)).length || 0;
      const completed = repairs?.filter(r => r.completed_at?.startsWith(dateStr)).length || 0;
      
      weekData.push({
        day: dayName,
        riparazioni: created,
        completate: completed
      });
    }
    setWeeklyData(weekData);
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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto" />
          <p className="text-muted-foreground text-sm mt-3">Caricamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Panoramica attività</p>
            </div>
            <Button
              onClick={() => navigate("/new-repair")}
              className="gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Ritiro</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />
        
        {/* Forfeiture Warning Alert */}
        {forfeitureWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 border-rose-200 bg-rose-50/50">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-rose-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-rose-800 text-sm">Dispositivi in Scadenza</h3>
                    <Badge className="bg-rose-500 text-white text-xs">{forfeitureWarnings.length}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {forfeitureWarnings.slice(0, 3).map((warning) => (
                      <div 
                        key={warning.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/80 cursor-pointer hover:bg-white transition-colors text-sm"
                        onClick={() => navigate(`/repairs/${warning.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {warning.device.brand} {warning.device.model}
                          </span>
                          <span className="text-muted-foreground truncate">• {warning.customer?.name || "N/A"}</span>
                        </div>
                        <Badge className={`${warning.daysLeft <= 3 ? 'bg-rose-600' : 'bg-rose-500'} text-white text-xs ml-2`}>
                          {warning.daysLeft}g
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {forfeitureWarnings.length > 3 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 h-7 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-100 px-2"
                      onClick={() => navigate("/repairs?status=completed")}
                    >
                      Vedi tutti ({forfeitureWarnings.length})
                      <ChevronRight className="h-3 w-3 ml-1" />
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
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {statsCards.map((card) => (
            <motion.div key={card.title} variants={itemVariants}>
              <Card 
                className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md group border ${card.highlight ? 'border-rose-300 bg-rose-50/50' : 'border-border/50 hover:border-border'}`}
                onClick={card.onClick}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-foreground leading-none">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.title}</p>
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
          className="grid grid-cols-3 gap-3"
        >
          <motion.div variants={itemVariants}>
            <Card className="p-4 border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{stats.totalCustomers}</p>
                  <p className="text-xs text-muted-foreground">Clienti</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-4 border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Euro className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">€{stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Fatturato</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-4 border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{stats.pendingRepairs + stats.inProgressRepairs}</p>
                  <p className="text-xs text-muted-foreground">Attive</p>
                </div>
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
          <Card className="border-border/50">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium text-foreground">Andamento Settimanale</h2>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Nuove</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Completate</span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRiparazioni" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
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
                      dataKey="riparazioni" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRiparazioni)" 
                      name="Nuove"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCompletate)" 
                      name="Completate"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Repairs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50 h-full">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium text-foreground">Riparazioni Recenti</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/repairs")}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  Vedi tutte
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-3">
                {recentRepairs.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nessuna riparazione</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentRepairs.map((repair) => {
                      const status = statusConfig[repair.status] || statusConfig.pending;
                      const DeviceIcon = getDeviceIcon(repair.device.device_type);
                      return (
                        <div
                          key={repair.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => navigate(`/repairs/${repair.id}`)}
                        >
                          <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
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
                            <DeviceIcon className={`h-4 w-4 text-muted-foreground ${repair.device.photo_url ? 'hidden' : ''}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {repair.device.brand} {repair.device.model}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {repair.customer?.name || "Cliente sconosciuto"}
                            </p>
                          </div>
                          <Badge className={`${status.bg} ${status.text} border-0 text-xs px-2 py-0.5`}>
                            {status.label}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-border/50 h-full">
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-medium text-foreground">Accesso Rapido</h2>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { icon: Wrench, label: "Gestione Riparazioni", path: "/repairs", color: "text-blue-500 bg-blue-100" },
                  { icon: Users, label: "Clienti", path: "/customers", color: "text-violet-500 bg-violet-100" },
                  { icon: Package, label: "Magazzino", path: "/inventory", color: "text-orange-500 bg-orange-100" },
                  { icon: ShoppingCart, label: "Ordini Ricambi", path: "/orders", color: "text-emerald-500 bg-emerald-100" },
                  { icon: Calendar, label: "Appuntamenti", path: "/appointments", color: "text-pink-500 bg-pink-100" },
                ].map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full justify-start h-11 font-normal hover:bg-muted/50 group"
                    onClick={() => navigate(item.path)}
                  >
                    <div className={`h-7 w-7 rounded-md ${item.color} flex items-center justify-center mr-3`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
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
