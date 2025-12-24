import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Power, Timer, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Capacitor } from "@capacitor/core";
import DeviceDiagnostics, { DeviceUptime } from "@/plugins/DeviceStoragePlugin";

export const UptimeWidget = () => {
  const [uptime, setUptime] = useState<DeviceUptime | null>(null);
  const [loading, setLoading] = useState(true);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const loadUptime = async () => {
      if (!isNative) {
        setLoading(false);
        return;
      }

      try {
        const result = await DeviceDiagnostics.getDeviceUptime();
        setUptime(result);
      } catch (error) {
        console.error("Error loading uptime:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUptime();
  }, [isNative]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!uptime) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dati non disponibili
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatLastBoot = () => {
    try {
      return format(new Date(uptime.lastBootTime), "d MMM yyyy, HH:mm", { locale: it });
    } catch {
      return "N/D";
    }
  };

  const getUptimeStatus = () => {
    if (uptime.uptimeDays >= 7) {
      return { 
        status: 'long', 
        color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
        message: 'Riavvio consigliato'
      };
    }
    if (uptime.uptimeDays >= 3) {
      return { 
        status: 'normal', 
        color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
        message: 'Normale'
      };
    }
    return { 
      status: 'recent', 
      color: 'bg-green-500/20 text-green-500 border-green-500/30',
      message: 'Recente'
    };
  };

  const status = getUptimeStatus();

  // Format uptime display
  const formatUptimeDisplay = () => {
    const days = uptime.uptimeDays;
    const hours = uptime.uptimeHours % 24;
    const minutes = uptime.uptimeMinutes % 60;

    if (days > 0) {
      return `${days}g ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Uptime Dispositivo
          </span>
          <Badge className={status.color}>
            {status.message}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main Uptime Display */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <Timer className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {formatUptimeDisplay()}
            </p>
            <p className="text-xs text-muted-foreground">
              Tempo dall'ultimo avvio
            </p>
          </div>
        </div>

        {/* Last Boot Info */}
        <div className="flex items-center gap-2 text-sm">
          <Power className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Ultimo avvio:</span>
          <span className="font-medium">{formatLastBoot()}</span>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center border-t pt-3">
          <div>
            <p className="text-lg font-bold tabular-nums">{uptime.uptimeDays}</p>
            <p className="text-xs text-muted-foreground">Giorni</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{uptime.uptimeHours % 24}</p>
            <p className="text-xs text-muted-foreground">Ore</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{uptime.uptimeMinutes % 60}</p>
            <p className="text-xs text-muted-foreground">Minuti</p>
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums">{uptime.uptimeSeconds % 60}</p>
            <p className="text-xs text-muted-foreground">Secondi</p>
          </div>
        </div>

        {/* Recommendation for long uptime */}
        {uptime.uptimeDays >= 7 && (
          <div className="text-xs text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 p-2 rounded">
            💡 Un riavvio periodico può migliorare le prestazioni del dispositivo
          </div>
        )}
      </CardContent>
    </Card>
  );
};