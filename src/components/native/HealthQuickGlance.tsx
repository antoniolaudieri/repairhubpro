import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Battery, 
  HardDrive, 
  MemoryStick, 
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthQuickGlanceProps {
  healthScore: number;
  batteryLevel: number | null;
  storagePercentUsed: number | null;
  ramPercentUsed: number | null;
  isOnline: boolean;
  isLoading?: boolean;
  lastSyncAt?: Date | null;
  onRefresh?: () => void;
}

export const HealthQuickGlance = ({
  healthScore,
  batteryLevel,
  storagePercentUsed,
  ramPercentUsed,
  isOnline,
  isLoading,
  lastSyncAt,
  onRefresh
}: HealthQuickGlanceProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-green-500/5';
    if (score >= 60) return 'from-yellow-500/20 to-yellow-500/5';
    if (score >= 40) return 'from-orange-500/20 to-orange-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  const getScoreRing = (score: number) => {
    if (score >= 80) return 'ring-green-500/30';
    if (score >= 60) return 'ring-yellow-500/30';
    if (score >= 40) return 'ring-orange-500/30';
    return 'ring-red-500/30';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 70) return <TrendingUp className="h-3 w-3" />;
    if (score >= 40) return <Minus className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const getMetricColor = (value: number, inverted: boolean = false) => {
    const effective = inverted ? value : (100 - value);
    if (effective >= 70) return 'text-green-500 bg-green-500/10';
    if (effective >= 40) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-red-500 bg-red-500/10';
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Mai sincronizzato';
    const now = new Date();
    const diff = now.getTime() - lastSyncAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ora';
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      "bg-gradient-to-br",
      getScoreBg(healthScore)
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Circular Health Score */}
          <div 
            className={cn(
              "relative h-16 w-16 rounded-full flex items-center justify-center",
              "ring-4",
              getScoreRing(healthScore),
              "bg-background/80 backdrop-blur-sm"
            )}
            onClick={onRefresh}
          >
            {isLoading ? (
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <span className={cn("text-2xl font-bold", getScoreColor(healthScore))}>
                  {healthScore}
                </span>
                {/* Animated ring progress */}
                <svg 
                  className="absolute inset-0 -rotate-90" 
                  viewBox="0 0 64 64"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    strokeWidth="4"
                    className="stroke-muted/30"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    strokeWidth="4"
                    strokeDasharray={`${(healthScore / 100) * 176} 176`}
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-1000",
                      healthScore >= 80 ? "stroke-green-500" :
                      healthScore >= 60 ? "stroke-yellow-500" :
                      healthScore >= 40 ? "stroke-orange-500" : "stroke-red-500"
                    )}
                  />
                </svg>
              </>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            {/* Battery */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              batteryLevel !== null 
                ? getMetricColor(batteryLevel, false)
                : "bg-muted/50 text-muted-foreground"
            )}>
              <Battery className="h-4 w-4" />
              <span className="text-sm font-medium">
                {batteryLevel !== null ? `${batteryLevel}%` : '--'}
              </span>
            </div>

            {/* Storage */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              storagePercentUsed !== null 
                ? getMetricColor(storagePercentUsed, true)
                : "bg-muted/50 text-muted-foreground"
            )}>
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">
                {storagePercentUsed !== null ? `${Math.round(storagePercentUsed)}%` : '--'}
              </span>
            </div>

            {/* RAM */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              ramPercentUsed !== null 
                ? getMetricColor(ramPercentUsed, true)
                : "bg-muted/50 text-muted-foreground"
            )}>
              <MemoryStick className="h-4 w-4" />
              <span className="text-sm font-medium">
                {ramPercentUsed !== null ? `${Math.round(ramPercentUsed)}%` : '--'}
              </span>
            </div>

            {/* Network */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5",
              isOnline 
                ? "bg-green-500/10 text-green-500"
                : "bg-red-500/10 text-red-500"
            )}>
              {isOnline ? (
                <Wifi className="h-4 w-4" />
              ) : (
                <WifiOff className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with trend and last sync */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className={cn("text-xs", getScoreColor(healthScore))}
            >
              {getScoreIcon(healthScore)}
              <span className="ml-1">
                {healthScore >= 80 ? 'Ottimo' :
                 healthScore >= 60 ? 'Buono' :
                 healthScore >= 40 ? 'Discreto' : 'Critico'}
              </span>
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Ultimo sync: {formatLastSync()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
