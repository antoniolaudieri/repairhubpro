import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNativeDeviceInfo } from "@/hooks/useNativeDeviceInfo";
import { useCustomerAchievements } from "@/hooks/useCustomerAchievements";
import { HealthScoreHero } from "@/components/native/HealthScoreHero";
import { QuickStatsRow } from "@/components/native/QuickStatsRow";
import { QuickActionsBar } from "@/components/native/QuickActionsBar";
import { GamificationPreview } from "@/components/native/GamificationPreview";
import { SmartRemindersWidget } from "@/components/native/SmartRemindersWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, AlertCircle, Info, Shield } from "lucide-react";

interface LoyaltyCard {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string;
  centro?: {
    business_name: string;
    logo_url?: string;
  };
}

interface DiagnosticIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
}

interface NativeHomeProps {
  user: User;
  loyaltyCard: LoyaltyCard;
  onNavigateProgress: () => void;
  onBookCheckup?: () => void;
}

export const NativeHome = ({
  user,
  loyaltyCard,
  onNavigateProgress,
  onBookCheckup,
}: NativeHomeProps) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const deviceData = useNativeDeviceInfo();

  const {
    achievements,
    stats: gamificationStats,
    levelInfo,
    recordSync,
    updateProgress,
  } = useCustomerAchievements({
    customerId: loyaltyCard.customer_id,
    centroId: loyaltyCard.centro_id,
    enabled: !!loyaltyCard,
  });

  // Find next achievement to unlock
  const nextAchievement = achievements
    .filter((a) => !a.is_unlocked)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  // Analyze device issues
  const analyzeIssues = useCallback((): DiagnosticIssue[] => {
    const issues: DiagnosticIssue[] = [];

    if (deviceData.batteryLevel !== null && deviceData.batteryLevel < 15) {
      issues.push({
        severity: "critical",
        title: "Batteria critica",
        description: `Solo ${deviceData.batteryLevel}% rimanente`,
      });
    } else if (deviceData.batteryLevel !== null && deviceData.batteryLevel < 30) {
      issues.push({
        severity: "warning",
        title: "Batteria bassa",
        description: "Considera di ricaricare il dispositivo",
      });
    }

    if (deviceData.storagePercentUsed !== null && deviceData.storagePercentUsed > 90) {
      issues.push({
        severity: "critical",
        title: "Memoria quasi piena",
        description: "Libera spazio per prestazioni migliori",
      });
    } else if (deviceData.storagePercentUsed !== null && deviceData.storagePercentUsed > 80) {
      issues.push({
        severity: "warning",
        title: "Memoria in esaurimento",
        description: `${deviceData.storagePercentUsed.toFixed(0)}% utilizzato`,
      });
    }

    if (deviceData.ramPercentUsed !== null && deviceData.ramPercentUsed > 90) {
      issues.push({
        severity: "warning",
        title: "RAM elevata",
        description: "Chiudi alcune app per migliorare le prestazioni",
      });
    }

    if (!deviceData.networkConnected || !deviceData.onlineStatus) {
      issues.push({
        severity: "critical",
        title: "Nessuna connessione",
        description: "Verifica WiFi o dati mobili",
      });
    }

    return issues;
  }, [deviceData]);

  const issues = analyzeIssues();
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const hasIssues = criticalCount > 0;

  // Fetch last sync
  useEffect(() => {
    const fetchLastSync = async () => {
      const { data } = await supabase
        .from("device_health_logs")
        .select("created_at")
        .eq("customer_id", loyaltyCard.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLastSyncAt(new Date(data.created_at));
      }
    };

    fetchLastSync();
  }, [loyaltyCard.customer_id]);

  const handleSync = async () => {
    if (deviceData.isLoading) {
      toast.error("Dati dispositivo non disponibili");
      return;
    }

    // Map battery health to valid DB values
    const validBatteryHealthValues = [
      "good",
      "overheat",
      "dead",
      "over_voltage",
      "unspecified_failure",
      "cold",
      "unknown",
    ];
    let batteryHealthValue = deviceData.batteryHealth || "unknown";
    if (!validBatteryHealthValues.includes(batteryHealthValue)) {
      if (batteryHealthValue === "charging" || batteryHealthValue === "fair") {
        batteryHealthValue = "good";
      } else if (batteryHealthValue === "low") {
        batteryHealthValue = "unspecified_failure";
      } else {
        batteryHealthValue = "unknown";
      }
    }

    setSyncing(true);
    try {
      // Try to get installed apps data
      let installedAppsData: any[] | null = null;
      try {
        const DeviceDiagnostics = (await import("@/plugins/DeviceStoragePlugin")).default;
        const [appsResult, usageResult] = await Promise.all([
          DeviceDiagnostics.getInstalledAppsStorage(),
          DeviceDiagnostics.getAppUsageStats().catch(() => ({ stats: [], hasPermission: false })),
        ]);

        const appsData = Array.isArray(appsResult) ? appsResult : (appsResult as any).apps || [];
        const usageStats = usageResult.stats || [];

        const usageMap = new Map<string, { totalTimeMinutes: number; lastTimeUsed: number }>();
        usageStats.forEach((stat: any) => {
          usageMap.set(stat.packageName, {
            totalTimeMinutes: stat.totalTimeMinutes || 0,
            lastTimeUsed: stat.lastTimeUsed || 0,
          });
        });

        installedAppsData = appsData.slice(0, 30).map((app: any) => {
          const usage = usageMap.get(app.packageName);
          return {
            packageName: app.packageName,
            appName: app.appName,
            totalSizeMb: app.totalSizeMb,
            appSizeMb: app.appSizeMb,
            dataSizeMb: app.dataSizeMb,
            cacheSizeMb: app.cacheSizeMb,
            isSystemApp: app.isSystemApp,
            totalTimeMinutes: usage?.totalTimeMinutes || 0,
            lastTimeUsed: usage?.lastTimeUsed || 0,
          };
        });
      } catch (e) {
        console.log("Could not get installed apps for sync:", e);
      }

      const { error: insertError } = await supabase.from("device_health_logs").insert({
        centro_id: loyaltyCard.centro_id,
        customer_id: loyaltyCard.customer_id,
        loyalty_card_id: loyaltyCard.id,
        source: "android_native",
        battery_level: deviceData.batteryLevel,
        battery_health: batteryHealthValue,
        is_charging: deviceData.isCharging,
        storage_total_gb: deviceData.storageTotalGb,
        storage_used_gb: deviceData.storageUsedGb,
        storage_available_gb: deviceData.storageAvailableGb,
        storage_percent_used: deviceData.storagePercentUsed,
        ram_total_mb: deviceData.ramTotalMb,
        ram_available_mb: deviceData.ramAvailableMb,
        ram_percent_used: deviceData.ramPercentUsed,
        device_model_info: deviceData.deviceModel,
        device_manufacturer: deviceData.deviceManufacturer,
        os_version: deviceData.osVersion,
        network_type: deviceData.networkType,
        network_connected: deviceData.networkConnected,
        online_status: deviceData.onlineStatus,
        screen_width: deviceData.screenWidth,
        screen_height: deviceData.screenHeight,
        pixel_ratio: deviceData.pixelRatio,
        color_depth: deviceData.colorDepth,
        orientation: deviceData.orientation,
        cpu_cores: deviceData.cpuCores,
        device_memory_gb: deviceData.deviceMemoryGb,
        hardware_concurrency: deviceData.hardwareConcurrency,
        touch_support: deviceData.touchSupport,
        max_touch_points: deviceData.maxTouchPoints,
        timezone: deviceData.timezone,
        language: deviceData.language,
        latitude: deviceData.latitude,
        longitude: deviceData.longitude,
        health_score: deviceData.healthScore,
        connection_downlink: deviceData.connectionDownlink,
        connection_effective_type: deviceData.connectionEffectiveType,
        connection_rtt: deviceData.connectionRtt,
        installed_apps: installedAppsData,
      });

      if (insertError) throw insertError;

      // Record sync for gamification
      await recordSync();

      // Update achievements
      if (deviceData.healthScore && deviceData.healthScore >= 80) {
        await updateProgress("health_master", (gamificationStats?.total_syncs || 0) + 1);
      }
      if (deviceData.batteryLevel && deviceData.batteryLevel >= 20) {
        await updateProgress("battery_champion", (gamificationStats?.total_syncs || 0) + 1);
      }

      setLastSyncAt(new Date());

      toast.success("Sincronizzazione completata! 🎮", {
        description: gamificationStats?.current_streak
          ? `Streak: ${gamificationStats.current_streak + 1} giorni!`
          : "Inizia la tua streak quotidiana!",
      });
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const handleBookCheckup = () => {
    if (onBookCheckup) {
      onBookCheckup();
    } else {
      toast.info("Funzione in arrivo", {
        description: "Presto potrai prenotare un check-up direttamente dall'app",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Centro info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-2"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            {loyaltyCard.centro?.business_name || "Centro Assistenza"}
          </span>
        </motion.div>

        {/* Health Score Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <HealthScoreHero
            score={deviceData.healthScore || 0}
            lastSyncAt={lastSyncAt}
            isLoading={deviceData.isLoading}
          />
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <QuickStatsRow
            batteryLevel={deviceData.batteryLevel}
            storagePercent={deviceData.storagePercentUsed}
            ramPercent={deviceData.ramPercentUsed}
            isOnline={deviceData.networkConnected ?? false}
            connectionType={deviceData.connectionEffectiveType}
          />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <QuickActionsBar
            onSync={handleSync}
            onBookCheckup={handleBookCheckup}
            isSyncing={syncing}
            hasIssues={hasIssues}
          />
        </motion.div>

        {/* Issues Banner */}
        {issues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Problemi Rilevati
                  <Badge variant="destructive" className="ml-auto">
                    {issues.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {issues.slice(0, 3).map((issue, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {getSeverityIcon(issue.severity)}
                      <div>
                        <span className="font-medium">{issue.title}:</span>{" "}
                        <span className="text-muted-foreground">{issue.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Gamification Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GamificationPreview
            level={levelInfo.level}
            levelName={levelInfo.name}
            xp={levelInfo.xp}
            progress={levelInfo.progress}
            streak={gamificationStats?.current_streak || 0}
            nextAchievement={
              nextAchievement
                ? {
                    name: nextAchievement.achievement_name,
                    icon: nextAchievement.achievement_icon || "🎯",
                    progress: nextAchievement.progress,
                    target: nextAchievement.target,
                  }
                : undefined
            }
            onViewAll={onNavigateProgress}
          />
        </motion.div>

        {/* Smart Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SmartRemindersWidget
            centroId={loyaltyCard.centro_id}
            customerId={loyaltyCard.customer_id}
          />
        </motion.div>
      </div>
    </ScrollArea>
  );
};
