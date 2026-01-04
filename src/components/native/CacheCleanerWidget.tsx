import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Settings, Loader2, HardDrive, AlertTriangle, Shield, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface CacheCleanerWidgetProps {
  storagePercentUsed?: number | null;
}

export const CacheCleanerWidget = ({ storagePercentUsed }: CacheCleanerWidgetProps) => {
  const [totalCacheSize, setTotalCacheSize] = useState<number | null>(null);
  const [ownAppCacheSize, setOwnAppCacheSize] = useState<number | null>(null);
  const [appsScanned, setAppsScanned] = useState<number>(0);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadCacheSize();
  }, []);

  const loadCacheSize = async () => {
    setIsLoading(true);
    try {
      const DeviceDiagnostics = (await import("@/plugins/DeviceStoragePlugin")).default;
      
      // Load both total cache and own app cache in parallel
      const [totalResult, ownResult] = await Promise.all([
        DeviceDiagnostics.getTotalCacheSize(),
        DeviceDiagnostics.getOwnAppCacheSize()
      ]);
      
      setTotalCacheSize(totalResult.totalCacheMb);
      setAppsScanned(totalResult.appsScanned);
      setNeedsPermission(totalResult.needsPermission);
      setOwnAppCacheSize(ownResult.cacheSizeMb);
    } catch (error) {
      console.error("Error loading cache size:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      const DeviceDiagnostics = (await import("@/plugins/DeviceStoragePlugin")).default;
      const result = await DeviceDiagnostics.requestUsageStatsPermission();
      if (result.settingsOpened) {
        toast.info("Abilita l'accesso per questa app", {
          description: "Dopo aver abilitato, torna qui e ricarica",
        });
      }
      // Reload after a short delay to check if permission was granted
      setTimeout(() => loadCacheSize(), 2000);
    } catch (error) {
      console.error("Error requesting permission:", error);
    }
  };

  const handleOpenStorageSettings = async () => {
    try {
      const DeviceDiagnostics = (await import("@/plugins/DeviceStoragePlugin")).default;
      await DeviceDiagnostics.openStorageSettings();
      toast.info("Pulisci la cache delle app", {
        description: "Seleziona le app e svuota la cache per liberare spazio",
      });
    } catch (error) {
      console.error("Error opening storage settings:", error);
      toast.error("Impossibile aprire le impostazioni");
    }
  };

  const handleClearAppCache = async () => {
    setIsClearing(true);
    try {
      const DeviceDiagnostics = (await import("@/plugins/DeviceStoragePlugin")).default;
      const result = await DeviceDiagnostics.clearAppCache();
      
      if (result.success) {
        const freedMb = result.freedMb || 0;
        if (freedMb > 0.01) {
          toast.success("Cache app pulita!", {
            description: `Liberati ${formatSize(freedMb)}`,
          });
        } else {
          toast.info("Cache già pulita", {
            description: "La cache di questa app era già vuota",
          });
        }
        // Reload cache size
        await loadCacheSize();
      } else {
        toast.error("Errore nella pulizia cache");
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Errore nella pulizia cache");
    } finally {
      setIsClearing(false);
    }
  };

  const formatSize = (mb: number | null) => {
    if (mb === null) return "—";
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    if (mb < 0.1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const showWarning = storagePercentUsed && storagePercentUsed > 80;

  return (
    <Card className={showWarning ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">Pulizia Rapida</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        {/* Own App Cache Info */}
        <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/10 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-medium truncate">Cache app</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <span className="text-xs sm:text-sm font-bold text-primary shrink-0">
              {formatSize(ownAppCacheSize)}
            </span>
          )}
        </div>

        {/* Total System Cache Info */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <HardDrive className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs sm:text-sm text-muted-foreground truncate">Cache sistema</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <span className="text-xs sm:text-sm font-medium">
                {formatSize(totalCacheSize)}
              </span>
              {appsScanned > 0 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({appsScanned})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Permission Warning */}
        {needsPermission && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Per vedere la cache reale di tutte le app, abilita l'accesso ai dati di utilizzo.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-amber-600 dark:text-amber-400 underline"
                onClick={handleRequestPermission}
              >
                <Shield className="h-3 w-3 mr-1" />
                Abilita permesso
              </Button>
            </div>
          </div>
        )}

        {showWarning && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Memoria quasi piena! Libera spazio per migliorare le prestazioni.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            onClick={handleClearAppCache}
            disabled={isClearing || (ownAppCacheSize !== null && ownAppCacheSize < 0.01)}
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1.5 shrink-0" />
            )}
            <span className="truncate">Pulisci App</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
            onClick={handleOpenStorageSettings}
          >
            <Settings className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="truncate">Tutte le App</span>
          </Button>
        </div>

        <p className="text-[10px] sm:text-xs text-muted-foreground text-center leading-tight">
          "Pulisci App" svuota solo questa app. "Tutte le App" apre le impostazioni per liberare spazio.
        </p>
      </CardContent>
    </Card>
  );
};
