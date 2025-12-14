import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertTriangle, ChevronRight, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface MaintenanceWidgetProps {
  centroId: string;
}

interface MaintenanceStats {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export function MaintenanceWidget({ centroId }: MaintenanceWidgetProps) {
  const [stats, setStats] = useState<MaintenanceStats>({ high: 0, medium: 0, low: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase
          .from("maintenance_predictions")
          .select("urgency")
          .eq("centro_id", centroId)
          .in("status", ["pending", "notified"]);

        if (error) throw error;

        const predictions = data || [];
        setStats({
          high: predictions.filter(p => p.urgency === "high").length,
          medium: predictions.filter(p => p.urgency === "medium").length,
          low: predictions.filter(p => p.urgency === "low").length,
          total: predictions.length,
        });
      } catch (error) {
        console.error("Error loading maintenance stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("maintenance-widget")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_predictions",
          filter: `centro_id=eq.${centroId}`,
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return null; // Don't show widget if no predictions
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            Manutenzioni Suggerite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {stats.high > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-lg font-bold text-red-600">{stats.high}</p>
                  <p className="text-[10px] text-red-600/80">Urgenti</p>
                </div>
              </div>
            )}
            {stats.medium > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
                <Wrench className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-lg font-bold text-amber-600">{stats.medium}</p>
                  <p className="text-[10px] text-amber-600/80">Medie</p>
                </div>
              </div>
            )}
            {stats.low > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                <Wrench className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-600">{stats.low}</p>
                  <p className="text-[10px] text-green-600/80">Basse</p>
                </div>
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between h-8 text-xs"
            onClick={() => navigate("/centro/clienti")}
          >
            <span>Vedi tutti i suggerimenti</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
