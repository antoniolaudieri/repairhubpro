import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Wrench, Building2, Clock, TrendingUp, Euro, Users } from "lucide-react";
import { motion } from "framer-motion";
import { PlatformAdminLayout } from "@/layouts/PlatformAdminLayout";

export default function AdminDashboard() {
  // Fetch counts
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [cornersRes, riparatoriRes, centriRes, pendingCornersRes, pendingRiparatoriRes, pendingCentriRes] = await Promise.all([
        supabase.from("corners").select("*", { count: "exact", head: true }),
        supabase.from("riparatori").select("*", { count: "exact", head: true }),
        supabase.from("centri_assistenza").select("*", { count: "exact", head: true }),
        supabase.from("corners").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("riparatori").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("centri_assistenza").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        corners: cornersRes.count || 0,
        riparatori: riparatoriRes.count || 0,
        centri: centriRes.count || 0,
        pendingCorners: pendingCornersRes.count || 0,
        pendingRiparatori: pendingRiparatoriRes.count || 0,
        pendingCentri: pendingCentriRes.count || 0,
      };
    },
  });

  const totalPending = (stats?.pendingCorners || 0) + (stats?.pendingRiparatori || 0) + (stats?.pendingCentri || 0);
  const totalProviders = (stats?.corners || 0) + (stats?.riparatori || 0) + (stats?.centri || 0);

  const statCards = [
    { 
      title: "Corner", 
      value: stats?.corners || 0, 
      pending: stats?.pendingCorners || 0,
      icon: Store, 
      color: "primary",
      gradient: "from-primary/20 to-primary/5"
    },
    { 
      title: "Riparatori", 
      value: stats?.riparatori || 0, 
      pending: stats?.pendingRiparatori || 0,
      icon: Wrench, 
      color: "info",
      gradient: "from-blue-500/20 to-blue-500/5"
    },
    { 
      title: "Centri", 
      value: stats?.centri || 0, 
      pending: stats?.pendingCentri || 0,
      icon: Building2, 
      color: "success",
      gradient: "from-green-500/20 to-green-500/5"
    },
    { 
      title: "In Attesa", 
      value: totalPending, 
      icon: Clock, 
      color: "warning",
      gradient: "from-amber-500/20 to-amber-500/5"
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
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
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Benvenuto, Admin
            </h1>
            <p className="text-muted-foreground">
              Gestisci il marketplace e monitora le attività dei provider
            </p>
          </div>
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -right-5 -bottom-5 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.title} variants={itemVariants}>
                <Card className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-border/50 hover:shadow-lg transition-all duration-300 group`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-xs md:text-sm text-muted-foreground font-medium">{stat.title}</p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                        {stat.pending !== undefined && stat.pending > 0 && (
                          <p className="text-xs text-warning font-medium">
                            {stat.pending} in attesa
                          </p>
                        )}
                      </div>
                      <div className={`p-2 md:p-3 rounded-xl bg-background/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.pending && stat.pending > 0 ? 'text-warning' : 'text-foreground/70'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Summary Cards */}
        <motion.div 
          className="grid md:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
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
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato Piattaforma</p>
                    <p className="text-2xl font-bold text-success">Attiva</p>
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
