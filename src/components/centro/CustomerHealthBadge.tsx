import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Smartphone, AlertTriangle, CheckCircle2, Clock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerHealthBadgeProps {
  customerId: string;
  centroId: string;
  compact?: boolean;
}

interface HealthData {
  hasActiveCard: boolean;
  lastHealthLog: {
    health_score: number;
    created_at: string;
    source: string;
  } | null;
  lastQuiz: {
    health_score: number;
    created_at: string;
  } | null;
  activeAlerts: number;
}

export function CustomerHealthBadge({ customerId, centroId, compact = false }: CustomerHealthBadgeProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        // Check if customer has active loyalty card
        const { data: loyaltyCard } = await supabase
          .from("loyalty_cards")
          .select("id, status")
          .eq("customer_id", customerId)
          .eq("centro_id", centroId)
          .eq("status", "active")
          .maybeSingle();

        // Get latest health log
        const { data: healthLog } = await supabase
          .from("device_health_logs")
          .select("health_score, created_at, source")
          .eq("customer_id", customerId)
          .eq("centro_id", centroId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get latest quiz
        const { data: quiz } = await supabase
          .from("diagnostic_quizzes")
          .select("health_score, created_at")
          .eq("customer_id", customerId)
          .eq("centro_id", centroId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get active alerts count
        const { count: alertsCount } = await supabase
          .from("device_health_alerts")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId)
          .eq("centro_id", centroId)
          .eq("status", "active");

        setHealthData({
          hasActiveCard: !!loyaltyCard,
          lastHealthLog: healthLog,
          lastQuiz: quiz,
          activeAlerts: alertsCount || 0
        });
      } catch (error) {
        console.error("Error fetching health data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`health-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "device_health_logs",
          filter: `customer_id=eq.${customerId}`
        },
        () => fetchHealthData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diagnostic_quizzes",
          filter: `customer_id=eq.${customerId}`
        },
        () => fetchHealthData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, centroId]);

  if (loading) {
    return compact ? null : (
      <div className="h-5 w-16 bg-muted animate-pulse rounded" />
    );
  }

  if (!healthData?.hasActiveCard) {
    return null;
  }

  const latestScore = healthData.lastHealthLog?.health_score || healthData.lastQuiz?.health_score;
  const latestDate = healthData.lastHealthLog?.created_at || healthData.lastQuiz?.created_at;
  const isAndroid = healthData.lastHealthLog?.source === "android_sdk";
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 40) return "text-orange-500";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/10 border-green-500/20";
    if (score >= 60) return "bg-amber-500/10 border-amber-500/20";
    if (score >= 40) return "bg-orange-500/10 border-orange-500/20";
    return "bg-destructive/10 border-destructive/20";
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-green-500" />
              {latestScore !== undefined && latestScore !== null && (
                <span className={cn("text-xs font-medium", getScoreColor(latestScore))}>
                  {latestScore}
                </span>
              )}
              {healthData.activeAlerts > 0 && (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">Monitoraggio attivo</p>
              {latestScore !== undefined && latestScore !== null && (
                <p>Score: {latestScore}/100</p>
              )}
              {latestDate && (
                <p className="text-muted-foreground">Ultimo: {formatTimeAgo(latestDate)}</p>
              )}
              {healthData.activeAlerts > 0 && (
                <p className="text-amber-500">{healthData.activeAlerts} alert attivi</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 text-xs",
                latestScore !== undefined && latestScore !== null 
                  ? getScoreBg(latestScore)
                  : "bg-green-500/10 border-green-500/20"
              )}
            >
              {isAndroid ? (
                <Smartphone className="h-3 w-3" />
              ) : (
                <Activity className="h-3 w-3" />
              )}
              <span className={latestScore !== undefined && latestScore !== null ? getScoreColor(latestScore) : "text-green-500"}>
                {latestScore !== undefined && latestScore !== null ? `${latestScore}%` : "Attivo"}
              </span>
            </Badge>
            
            {healthData.activeAlerts > 0 && (
              <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 border-amber-500/20">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500">{healthData.activeAlerts}</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">Monitoraggio Attivo</span>
            </div>
            
            {latestScore !== undefined && latestScore !== null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Health Score: <strong className={getScoreColor(latestScore)}>{latestScore}/100</strong></span>
              </div>
            )}
            
            {latestDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Ultimo aggiornamento: {formatTimeAgo(latestDate)}</span>
              </div>
            )}
            
            {isAndroid && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android SDK attivo</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
