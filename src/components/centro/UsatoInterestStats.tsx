import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Users, Mail, Smartphone, Laptop, Watch, Eye, BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface InterestStats {
  totalInterests: number;
  activeNotifications: number;
  notifiedUsers: number;
  byDeviceType: Record<string, number>;
}

const deviceTypeIcons: Record<string, any> = {
  smartphone: Smartphone,
  tablet: Smartphone,
  laptop: Laptop,
  pc: Laptop,
  smartwatch: Watch,
};

const deviceTypeLabels: Record<string, string> = {
  smartphone: "Smartphone",
  tablet: "Tablet",
  laptop: "Laptop",
  pc: "PC",
  smartwatch: "Smartwatch",
};

export function UsatoInterestStats() {
  const [stats, setStats] = useState<InterestStats>({
    totalInterests: 0,
    activeNotifications: 0,
    notifiedUsers: 0,
    byDeviceType: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("used_device_interests")
        .select("*");

      if (error) throw error;

      const interests = data || [];
      
      // Calculate stats
      const totalInterests = interests.length;
      const activeNotifications = interests.filter(i => i.notify_enabled).length;
      const notifiedUsers = interests.filter(i => i.last_notified_at !== null).length;
      
      // Count by device type
      const byDeviceType: Record<string, number> = {};
      interests.forEach(interest => {
        const types = interest.device_types || [];
        types.forEach((type: string) => {
          const normalizedType = type.toLowerCase();
          byDeviceType[normalizedType] = (byDeviceType[normalizedType] || 0) + 1;
        });
      });

      setStats({
        totalInterests,
        activeNotifications,
        notifiedUsers,
        byDeviceType,
      });
    } catch (error) {
      console.error("Error fetching interest stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  if (stats.totalInterests === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 md:p-5"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <BellRing className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Interessi Clienti</h3>
            <p className="text-xs text-muted-foreground">
              Clienti in attesa di notifiche su dispositivi usati
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.totalInterests}</p>
              <p className="text-[10px] text-muted-foreground">Iscritti</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <Bell className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.activeNotifications}</p>
              <p className="text-[10px] text-muted-foreground">Attivi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/50 border border-border/50">
            <div className="p-1.5 rounded-md bg-violet-500/10">
              <Mail className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.notifiedUsers}</p>
              <p className="text-[10px] text-muted-foreground">Raggiunti</p>
            </div>
          </div>
        </div>

        {/* Device Type Breakdown */}
        {Object.keys(stats.byDeviceType).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground self-center">Interesse per:</span>
            {Object.entries(stats.byDeviceType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const Icon = deviceTypeIcons[type] || Eye;
                const label = deviceTypeLabels[type] || type;
                return (
                  <Badge 
                    key={type} 
                    variant="secondary" 
                    className="gap-1 text-xs px-2 py-0.5"
                  >
                    <Icon className="h-3 w-3" />
                    {label} ({count})
                  </Badge>
                );
              })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
