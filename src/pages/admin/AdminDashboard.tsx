import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Wrench, 
  Building2, 
  Clock, 
  TrendingUp, 
  Euro, 
  Users, 
  ArrowRight,
  Smartphone,
  Package,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch counts
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [
        cornersRes, 
        riparatoriRes, 
        centriRes, 
        pendingCornersRes, 
        pendingRiparatoriRes, 
        pendingCentriRes,
        customersRes,
        repairsRes,
        ordersRes,
        pendingRepairsRes,
        completedRepairsRes
      ] = await Promise.all([
        supabase.from("corners").select("*", { count: "exact", head: true }),
        supabase.from("riparatori").select("*", { count: "exact", head: true }),
        supabase.from("centri_assistenza").select("*", { count: "exact", head: true }),
        supabase.from("corners").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("riparatori").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("centri_assistenza").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("repairs").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("repairs").select("*", { count: "exact", head: true }).eq("status", "completed"),
      ]);
      return {
        corners: cornersRes.count || 0,
        riparatori: riparatoriRes.count || 0,
        centri: centriRes.count || 0,
        pendingCorners: pendingCornersRes.count || 0,
        pendingRiparatori: pendingRiparatoriRes.count || 0,
        pendingCentri: pendingCentriRes.count || 0,
        customers: customersRes.count || 0,
        repairs: repairsRes.count || 0,
        orders: ordersRes.count || 0,
        pendingRepairs: pendingRepairsRes.count || 0,
        completedRepairs: completedRepairsRes.count || 0,
      };
    },
  });

  // Fetch recent pending registrations
  const { data: recentPending } = useQuery({
    queryKey: ["admin-recent-pending"],
    queryFn: async () => {
      const [cornersRes, riparatoriRes, centriRes] = await Promise.all([
        supabase.from("corners").select("id, business_name, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(3),
        supabase.from("riparatori").select("id, full_name, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(3),
        supabase.from("centri_assistenza").select("id, business_name, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(3),
      ]);
      
      const items = [
        ...(cornersRes.data || []).map(c => ({ ...c, type: 'corner', name: c.business_name })),
        ...(riparatoriRes.data || []).map(r => ({ ...r, type: 'riparatore', name: r.full_name })),
        ...(centriRes.data || []).map(c => ({ ...c, type: 'centro', name: c.business_name })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
      
      return items;
    },
  });

  const totalPending = (stats?.pendingCorners || 0) + (stats?.pendingRiparatori || 0) + (stats?.pendingCentri || 0);
  const totalProviders = (stats?.corners || 0) + (stats?.riparatori || 0) + (stats?.centri || 0);

  const providerCards = [
    { 
      title: "Corner", 
      value: stats?.corners || 0, 
      pending: stats?.pendingCorners || 0,
      icon: Store, 
      gradient: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-500",
      url: "/admin/corners"
    },
    { 
      title: "Riparatori", 
      value: stats?.riparatori || 0, 
      pending: stats?.pendingRiparatori || 0,
      icon: Wrench, 
      gradient: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      url: "/admin/riparatori"
    },
    { 
      title: "Centri", 
      value: stats?.centri || 0, 
      pending: stats?.pendingCentri || 0,
      icon: Building2, 
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
      url: "/admin/centri"
    },
  ];

  const platformCards = [
    { 
      title: "Clienti", 
      value: stats?.customers || 0, 
      icon: Users, 
      gradient: "from-pink-500/20 to-pink-500/5",
      iconColor: "text-pink-500",
      url: "/customers"
    },
    { 
      title: "Riparazioni", 
      value: stats?.repairs || 0, 
      subtitle: `${stats?.pendingRepairs || 0} in corso`,
      icon: Smartphone, 
      gradient: "from-orange-500/20 to-orange-500/5",
      iconColor: "text-orange-500",
      url: "/repairs"
    },
    { 
      title: "Ordini", 
      value: stats?.orders || 0, 
      icon: ShoppingCart, 
      gradient: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500",
      url: "/orders"
    },
  ];

  const quickActions = [
    { title: "Nuova Riparazione", icon: Smartphone, url: "/new-repair", color: "bg-primary" },
    { title: "Gestisci Inventario", icon: Package, url: "/inventory", color: "bg-emerald-500" },
    { title: "Gestisci Crediti", icon: Euro, url: "/admin/crediti", color: "bg-amber-500" },
    { title: "Vedi Commissioni", icon: TrendingUp, url: "/admin/commissioni", color: "bg-violet-500" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'corner': return Store;
      case 'riparatore': return Wrench;
      case 'centro': return Building2;
      default: return Users;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'corner': return 'Corner';
      case 'riparatore': return 'Riparatore';
      case 'centro': return 'Centro';
      default: return type;
    }
  };

  return (
    <PlatformAdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 border border-primary/20"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Benvenuto, Admin
              </h1>
              <p className="text-muted-foreground">
                Gestisci il marketplace e monitora le attività dei provider
              </p>
            </div>
            {totalPending > 0 && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-xl px-4 py-3"
              >
                <AlertCircle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-semibold text-warning">{totalPending} richieste in attesa</p>
                  <p className="text-xs text-muted-foreground">Richiedono la tua attenzione</p>
                </div>
              </motion.div>
            )}
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -right-5 -bottom-5 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        </motion.div>

        {/* Provider Stats - Clickable */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Provider Marketplace
            </h2>
            <Badge variant="outline" className="text-xs">
              {totalProviders} totali
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {providerCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.title} variants={itemVariants}>
                  <Card 
                    className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group`}
                    onClick={() => navigate(stat.url)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                          {stat.pending > 0 && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs animate-pulse">
                              {stat.pending} in attesa
                            </Badge>
                          )}
                        </div>
                        <div className={`p-3 rounded-xl bg-background/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                        </div>
                      </div>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">Azioni Rapide</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div key={action.title} variants={itemVariants}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-accent/50 hover:scale-[1.02] transition-all duration-300 border-border/50"
                    onClick={() => navigate(action.url)}
                  >
                    <div className={`p-2 rounded-lg ${action.color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">{action.title}</span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Platform Stats & Recent Pending */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Platform Stats - Clickable */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Card className="bg-card/50 backdrop-blur border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Statistiche Piattaforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {platformCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div 
                      key={stat.title} 
                      variants={itemVariants}
                      className={`flex items-center justify-between p-4 rounded-xl bg-gradient-to-r ${stat.gradient} cursor-pointer hover:scale-[1.01] transition-all duration-300 group`}
                      onClick={() => navigate(stat.url)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-background/50 backdrop-blur-sm`}>
                          <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{stat.title}</p>
                          {stat.subtitle && (
                            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-foreground">{stat.value}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Pending */}
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            <Card className="bg-card/50 backdrop-blur border-border/50 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Richieste Recenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentPending && recentPending.length > 0 ? (
                  <div className="space-y-3">
                    {recentPending.map((item, index) => {
                      const Icon = getTypeIcon(item.type);
                      return (
                        <motion.div 
                          key={item.id} 
                          variants={itemVariants}
                          className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 cursor-pointer transition-all duration-300"
                          onClick={() => navigate(`/admin/${item.type === 'centro' ? 'centri' : item.type + 's'}`)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10">
                              <Icon className="h-4 w-4 text-warning" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                                {item.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.created_at), "dd MMM, HH:mm", { locale: it })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(item.type)}
                          </Badge>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
                    <p className="text-sm font-medium text-foreground">Tutto in ordine!</p>
                    <p className="text-xs text-muted-foreground">Nessuna richiesta in attesa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Overview Cards */}
        <motion.div 
          className="grid md:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Totale Provider</p>
                    <p className="text-2xl font-bold">{totalProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Riparazioni Completate</p>
                    <p className="text-2xl font-bold">{stats?.completedRepairs || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato Piattaforma</p>
                    <p className="text-2xl font-bold text-emerald-500">Attiva</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </PlatformAdminLayout>
  );
}
