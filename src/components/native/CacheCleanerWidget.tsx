import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Settings, Loader2, HardDrive, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";

interface CacheCleanerWidgetProps {
  storagePercentUsed?: number | null;
}

export const CacheCleanerWidget = ({ storagePercentUsed }: CacheCleanerWidgetProps) => {
  const [totalCacheSize, setTotalCacheSize] = useState<number | null>(null);
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
      const result = await DeviceDiagnostics.getTotalCacheSize();
      setTotalCacheSize(result.totalCacheMb);
      setAppsScanned(result.appsScanned);
      setNeedsPermission(result.needsPermission);
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
        toast.success("Cache app pulita!", {
          description: `Liberati ${result.freedMb?.toFixed(1) || 0} MB`,
        });
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
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(0)} MB`;
  };

  const showWarning = storagePercentUsed && storagePercentUsed > 80;

  return (
    <Card className={showWarning ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-primary" />
          Pulizia Rapida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cache Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cache totale</span>
          </div>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {formatSize(totalCacheSize)}
              </span>
              {appsScanned > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({appsScanned} app)
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleClearAppCache}
            disabled={isClearing}
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Pulisci App
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleOpenStorageSettings}
          >
            <Settings className="h-4 w-4 mr-2" />
            Pulisci Tutto
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          "Pulisci Tutto" apre le impostazioni Android per liberare cache di tutte le app
        </p>
      </CardContent>
    </Card>
  );
};
