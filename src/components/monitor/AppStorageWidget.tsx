import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Shield, Loader2, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import DeviceDiagnostics, { AppStorageInfo } from '@/plugins/DeviceStoragePlugin';
import { Capacitor } from '@capacitor/core';

interface AppStorageWidgetProps {
  onRefresh?: () => void;
}

// Known potentially unwanted apps/adware patterns
const SUSPICIOUS_PATTERNS = [
  'cleaner', 'booster', 'battery.saver', 'memory.clean',
  'speed.up', 'antivirus.free', 'vpn.free', 'coin.miner',
  'lucky.patcher', 'hack', 'crack', 'mod.apk'
];

const SYSTEM_PACKAGES = [
  'com.google', 'com.android', 'com.samsung', 'com.huawei',
  'com.xiaomi', 'com.oppo', 'com.vivo', 'com.oneplus'
];

export const AppStorageWidget = ({ onRefresh }: AppStorageWidgetProps) => {
  const [apps, setApps] = useState<AppStorageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showSystemApps, setShowSystemApps] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const appList = await DeviceDiagnostics.getInstalledAppsStorage();
      // Sort by size descending
      appList.sort((a, b) => b.totalSizeMb - a.totalSizeMb);
      setApps(appList);
    } catch (e: any) {
      console.error('Failed to load app storage:', e);
      setError(e.message || 'Impossibile caricare le app');
    } finally {
      setLoading(false);
    }
  };

  const isSuspicious = (app: AppStorageInfo): boolean => {
    const packageLower = app.packageName.toLowerCase();
    const nameLower = (app.appName || '').toLowerCase();
    
    return SUSPICIOUS_PATTERNS.some(pattern => 
      packageLower.includes(pattern) || nameLower.includes(pattern)
    );
  };

  const isSystemApp = (app: AppStorageInfo): boolean => {
    return SYSTEM_PACKAGES.some(prefix => 
      app.packageName.startsWith(prefix)
    ) || app.isSystemApp;
  };

  const filteredApps = apps.filter(app => 
    showSystemApps ? true : !isSystemApp(app)
  );

  const displayedApps = expanded ? filteredApps : filteredApps.slice(0, 5);
  
  const suspiciousApps = apps.filter(isSuspicious);
  const largeApps = apps.filter(app => app.totalSizeMb > 500);
  const totalStorageUsed = apps.reduce((sum, app) => sum + app.totalSizeMb, 0);

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  if (!Capacitor.isNativePlatform()) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            App Installate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Questa funzione richiede l'app nativa Android
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Installala per vedere lo storage di ogni app e rilevare possibili malware
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            App Installate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">
              Analisi app in corso...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            App Installate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Potrebbe essere necessario concedere il permesso "Accesso utilizzo app"
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadApps}
            >
              Riprova
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            App Installate
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {apps.length} app
            </Badge>
            <Badge variant="secondary">
              {formatSize(totalStorageUsed)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warnings */}
        {suspiciousApps.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {suspiciousApps.length} App Sospette Rilevate
              </span>
            </div>
            <p className="text-xs text-red-600/80">
              Queste app potrebbero essere malware o adware. Consigliamo la rimozione.
            </p>
          </div>
        )}

        {largeApps.length > 3 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">
                {largeApps.length} App Pesanti (&gt;500MB)
              </span>
            </div>
            <p className="text-xs text-amber-600/80">
              Queste app occupano molto spazio. Considera di rimuovere quelle inutilizzate.
            </p>
          </div>
        )}

        {/* Toggle system apps */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowSystemApps(!showSystemApps)}
          >
            {showSystemApps ? 'Nascondi' : 'Mostra'} app di sistema
          </Button>
        </div>

        {/* App List */}
        <ScrollArea className={cn("pr-2", expanded ? "h-[400px]" : "")}>
          <div className="space-y-2">
            {displayedApps.map((app) => {
              const suspicious = isSuspicious(app);
              const system = isSystemApp(app);
              
              return (
                <div
                  key={app.packageName}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                    suspicious 
                      ? "bg-red-500/5 border-red-500/30" 
                      : system
                        ? "bg-muted/30 border-muted"
                        : "bg-background border-border"
                  )}
                >
                  {/* App Icon placeholder */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    suspicious ? "bg-red-500/10" : "bg-muted"
                  )}>
                    {app.iconBase64 ? (
                      <img 
                        src={`data:image/png;base64,${app.iconBase64}`} 
                        alt={app.appName}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Package className={cn(
                        "h-5 w-5",
                        suspicious ? "text-red-500" : "text-muted-foreground"
                      )} />
                    )}
                  </div>

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        suspicious && "text-red-600"
                      )}>
                        {app.appName || app.packageName.split('.').pop()}
                      </p>
                      {suspicious && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1">
                          Sospetta
                        </Badge>
                      )}
                      {system && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.packageName}
                    </p>
                  </div>

                  {/* Size */}
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-sm font-medium",
                      app.totalSizeMb > 500 && "text-amber-600"
                    )}>
                      {formatSize(app.totalSizeMb)}
                    </p>
                    {app.cacheSizeMb > 50 && (
                      <p className="text-xs text-muted-foreground">
                        Cache: {formatSize(app.cacheSizeMb)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Expand/Collapse */}
        {filteredApps.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Mostra meno
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Mostra tutte ({filteredApps.length - 5} altre)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AppStorageWidget;