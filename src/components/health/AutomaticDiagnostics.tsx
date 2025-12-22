import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Smartphone, Battery, HardDrive, Cpu, Wifi, Monitor, 
  Gauge, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Loader2, Zap, MemoryStick
} from "lucide-react";
import { useDeviceInfo, formatBytes, getHealthStatus, type DeviceInfo } from "@/hooks/useDeviceInfo";
import { cn } from "@/lib/utils";

interface AutomaticDiagnosticsProps {
  onDataReady?: (data: DeviceInfo) => void;
  compact?: boolean;
  showRefresh?: boolean;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null;
  subValue?: string;
  status?: 'good' | 'warning' | 'critical' | 'unknown';
  supported?: boolean;
  progress?: number;
}

function MetricCard({ icon, label, value, subValue, status = 'unknown', supported = true, progress }: MetricCardProps) {
  const statusColors = {
    good: 'bg-green-500/10 text-green-600 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    critical: 'bg-red-500/10 text-red-600 border-red-500/20',
    unknown: 'bg-muted text-muted-foreground border-border'
  };
  
  const statusIcons = {
    good: <CheckCircle2 className="h-3.5 w-3.5" />,
    warning: <AlertTriangle className="h-3.5 w-3.5" />,
    critical: <XCircle className="h-3.5 w-3.5" />,
    unknown: null
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 opacity-60">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">Non disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
        statusColors[status]
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center",
        status === 'good' ? 'bg-green-500/20' :
        status === 'warning' ? 'bg-yellow-500/20' :
        status === 'critical' ? 'bg-red-500/20' :
        'bg-muted'
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{label}</p>
          {statusIcons[status]}
        </div>
        <p className="text-lg font-bold">{value ?? 'N/D'}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        {progress !== undefined && (
          <Progress value={progress} className="h-1.5 mt-1" />
        )}
      </div>
    </motion.div>
  );
}

export function AutomaticDiagnostics({ onDataReady, compact = false, showRefresh = true }: AutomaticDiagnosticsProps) {
  const deviceInfo = useDeviceInfo();
  
  // Notify parent when data is ready
  if (!deviceInfo.loading && onDataReady) {
    onDataReady(deviceInfo);
  }

  if (deviceInfo.loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
            <div>
              <CardTitle className="text-lg">Rilevamento in corso...</CardTitle>
              <CardDescription>Analisi hardware dispositivo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const getPlatformIcon = () => {
    if (deviceInfo.isIOS) return "🍎";
    if (deviceInfo.isAndroid) return "🤖";
    return "💻";
  };

  // Calculate overall health based on available metrics
  let overallScore = 100;
  let metricsCount = 0;
  
  if (deviceInfo.battery.supported && deviceInfo.battery.level !== null) {
    const batteryScore = deviceInfo.battery.level;
    overallScore += batteryScore;
    metricsCount++;
  }
  
  if (deviceInfo.storage.supported && deviceInfo.storage.percentUsed !== null) {
    const storageScore = 100 - deviceInfo.storage.percentUsed;
    overallScore += storageScore;
    metricsCount++;
  }
  
  if (metricsCount > 0) {
    overallScore = Math.round((overallScore - 100) / metricsCount + 100);
  } else {
    overallScore = 0; // No metrics available
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
              {getPlatformIcon()}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {deviceInfo.model || 'Dispositivo'}
                {deviceInfo.isPWA && (
                  <Badge variant="secondary" className="text-xs">PWA</Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {deviceInfo.manufacturer && <span>{deviceInfo.manufacturer}</span>}
                {deviceInfo.osVersion && (
                  <>
                    <span>•</span>
                    <span>{deviceInfo.isIOS ? 'iOS' : deviceInfo.isAndroid ? 'Android' : 'OS'} {deviceInfo.osVersion}</span>
                  </>
                )}
                {deviceInfo.modelConfidence === 'exact' && (
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Modello esatto
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          {showRefresh && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Battery */}
        <MetricCard
          icon={<Battery className="h-5 w-5" />}
          label="Batteria"
          value={deviceInfo.battery.level !== null ? `${deviceInfo.battery.level}%` : null}
          subValue={deviceInfo.battery.charging ? '⚡ In ricarica' : undefined}
          status={deviceInfo.battery.level !== null 
            ? getHealthStatus(deviceInfo.battery.level, { good: 50, warning: 20 })
            : 'unknown'}
          supported={deviceInfo.battery.supported}
          progress={deviceInfo.battery.level ?? undefined}
        />
        
        {/* Storage */}
        <MetricCard
          icon={<HardDrive className="h-5 w-5" />}
          label="Spazio di Archiviazione"
          value={deviceInfo.storage.percentUsed !== null 
            ? `${100 - deviceInfo.storage.percentUsed}% libero` 
            : null}
          subValue={deviceInfo.storage.available !== null 
            ? `${formatBytes(deviceInfo.storage.available)} disponibili su ${formatBytes(deviceInfo.storage.total)}`
            : undefined}
          status={deviceInfo.storage.percentUsed !== null 
            ? getHealthStatus(100 - deviceInfo.storage.percentUsed, { good: 30, warning: 10 })
            : 'unknown'}
          supported={deviceInfo.storage.supported}
          progress={deviceInfo.storage.percentUsed !== null ? 100 - deviceInfo.storage.percentUsed : undefined}
        />
        
        {/* RAM */}
        <MetricCard
          icon={<MemoryStick className="h-5 w-5" />}
          label="Memoria RAM"
          value={deviceInfo.memory.deviceMemory !== null ? `${deviceInfo.memory.deviceMemory} GB` : null}
          status={deviceInfo.memory.deviceMemory !== null 
            ? deviceInfo.memory.deviceMemory >= 4 ? 'good' : deviceInfo.memory.deviceMemory >= 2 ? 'warning' : 'critical'
            : 'unknown'}
          supported={deviceInfo.memory.supported}
        />
        
        {/* CPU */}
        <MetricCard
          icon={<Cpu className="h-5 w-5" />}
          label="Processore"
          value={deviceInfo.cpu.cores !== null ? `${deviceInfo.cpu.cores} core` : null}
          status={deviceInfo.cpu.cores !== null 
            ? deviceInfo.cpu.cores >= 6 ? 'good' : deviceInfo.cpu.cores >= 4 ? 'warning' : 'critical'
            : 'unknown'}
          supported={deviceInfo.cpu.supported}
        />
        
        {/* Network */}
        <MetricCard
          icon={<Wifi className="h-5 w-5" />}
          label="Connessione"
          value={deviceInfo.network.effectiveType?.toUpperCase() || deviceInfo.network.type || null}
          subValue={deviceInfo.network.downlink !== null 
            ? `${deviceInfo.network.downlink} Mbps • ${deviceInfo.network.rtt}ms latenza`
            : undefined}
          status={deviceInfo.network.effectiveType 
            ? deviceInfo.network.effectiveType === '4g' ? 'good' : 
              deviceInfo.network.effectiveType === '3g' ? 'warning' : 'critical'
            : 'unknown'}
          supported={deviceInfo.network.supported}
        />
        
        {/* Screen */}
        {!compact && (
          <MetricCard
            icon={<Monitor className="h-5 w-5" />}
            label="Schermo"
            value={`${deviceInfo.screen.width}×${deviceInfo.screen.height}`}
            subValue={`${deviceInfo.screen.dpr}x DPI • ${deviceInfo.screen.orientation}`}
            status="good"
            supported={true}
          />
        )}

        {/* iOS notice */}
        {deviceInfo.isIOS && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-sm">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              Su iOS alcune metriche (batteria, rete, RAM) non sono accessibili dal browser per motivi di privacy.
            </p>
          </div>
        )}

        {/* Overall health indicator */}
        {metricsCount > 0 && !compact && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Salute Rilevata Automaticamente
              </span>
              <span className={cn(
                "text-lg font-bold",
                overallScore >= 70 ? "text-green-600" :
                overallScore >= 40 ? "text-yellow-600" :
                "text-red-600"
              )}>
                {overallScore}/100
              </span>
            </div>
            <Progress 
              value={overallScore} 
              className={cn(
                "h-2",
                overallScore >= 70 ? "[&>div]:bg-green-500" :
                overallScore >= 40 ? "[&>div]:bg-yellow-500" :
                "[&>div]:bg-red-500"
              )} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
