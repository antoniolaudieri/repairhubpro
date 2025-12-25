import { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Shield, Loader2, HardDrive, ChevronDown, ChevronUp, Smartphone, ExternalLink, RefreshCw, Settings, Trash2, Zap, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import DeviceDiagnostics, { AppStorageInfo, AppUsageStat } from '@/plugins/DeviceStoragePlugin';

interface AppStorageWidgetProps {
  onRefresh?: () => void;
}

interface AppAnalysis {
  app: AppStorageInfo;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  issues: string[];
  recommendations: string[];
  storageImpact: 'minimal' | 'moderate' | 'heavy' | 'extreme';
  usageMinutes?: number;
  lastUsed?: number;
}

type SortOption = 'risk' | 'size' | 'usage' | 'lastUsed';
type FilterOption = 'all' | 'problems' | 'heavy' | 'unused' | 'recent';

export const AppStorageWidget = ({ onRefresh }: AppStorageWidgetProps) => {
  const [apps, setApps] = useState<AppStorageInfo[]>([]);
  const [analyzedApps, setAnalyzedApps] = useState<AppAnalysis[]>([]);
  const [usageStats, setUsageStats] = useState<Map<string, AppUsageStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    loadApps();
  }, []);

  const analyzeApp = (app: AppStorageInfo): AppAnalysis => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let storageImpact: 'minimal' | 'moderate' | 'heavy' | 'extreme' = 'minimal';

    // Analyze storage impact
    if (app.totalSizeMb > 1000) {
      storageImpact = 'extreme';
      issues.push('Occupa più di 1GB di spazio');
      recommendations.push('Considera di pulire la cache o eliminare dati vecchi');
      riskLevel = 'high';
    } else if (app.totalSizeMb > 500) {
      storageImpact = 'heavy';
      issues.push('Consumo storage elevato');
      if (riskLevel === 'low') riskLevel = 'medium';
    } else if (app.totalSizeMb > 200) {
      storageImpact = 'moderate';
    }

    // Analyze cache
    if (app.cacheSizeMb > 100) {
      issues.push(`Cache molto grande (${app.cacheSizeMb.toFixed(0)} MB)`);
      recommendations.push('Svuota la cache dalle impostazioni app');
      if (riskLevel === 'low') riskLevel = 'medium';
    } else if (app.cacheSizeMb > 50) {
      issues.push('Cache accumulata');
      recommendations.push('Considera di pulire la cache periodicamente');
    }

    // Analyze data vs app size ratio
    if (app.appSizeMb > 0) {
      const dataRatio = app.dataSizeMb / app.appSizeMb;
      if (dataRatio > 5) {
        issues.push('Troppi dati accumulati rispetto alla dimensione app');
        recommendations.push('Elimina contenuti scaricati o conversazioni vecchie');
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // Check for potentially problematic apps by name
    const appNameLower = (app.appName || app.packageName).toLowerCase();
    
    // Cleaner/Booster apps (often problematic)
    if (appNameLower.includes('cleaner') || appNameLower.includes('booster') || 
        appNameLower.includes('optimizer') || appNameLower.includes('antivirus') ||
        appNameLower.includes('speed') || appNameLower.includes('master')) {
      if (!app.isSystemApp) {
        issues.push('App potenzialmente non necessaria');
        recommendations.push('Queste app spesso consumano risorse senza benefici reali');
        riskLevel = 'critical';
      }
    }

    // Battery/RAM savers
    if (appNameLower.includes('battery') || appNameLower.includes('ram') || 
        appNameLower.includes('memory')) {
      if (!app.isSystemApp) {
        issues.push('App di ottimizzazione di terze parti');
        recommendations.push('Android gestisce già batteria e RAM automaticamente');
        if (riskLevel === 'low') riskLevel = 'medium';
      }
    }

    // VPN apps with large data
    if ((appNameLower.includes('vpn') || appNameLower.includes('proxy')) && app.dataSizeMb > 100) {
      issues.push('VPN con molti dati accumulati');
      recommendations.push('Verifica che non stia loggando troppo traffico');
    }

    // Social media with excessive storage
    if ((appNameLower.includes('facebook') || appNameLower.includes('instagram') || 
         appNameLower.includes('tiktok') || appNameLower.includes('snapchat')) && 
        app.totalSizeMb > 500) {
      issues.push('App social con storage eccessivo');
      recommendations.push('Disattiva download automatico media nelle impostazioni app');
    }

    // Messaging apps
    if ((appNameLower.includes('whatsapp') || appNameLower.includes('telegram') || 
         appNameLower.includes('messenger')) && app.dataSizeMb > 300) {
      issues.push('Molti media salvati nelle conversazioni');
      recommendations.push('Elimina media vecchi o attiva eliminazione automatica');
    }

    // Gaming apps
    if (appNameLower.includes('game') || appNameLower.includes('clash') || 
        appNameLower.includes('candy') || appNameLower.includes('pubg') ||
        appNameLower.includes('fortnite')) {
      if (app.totalSizeMb > 1000) {
        issues.push('Gioco che occupa molto spazio');
        recommendations.push('Elimina i giochi che non usi più');
      }
    }

    return { app, riskLevel, issues, recommendations, storageImpact };
  };

  const loadApps = async () => {
    try {
      setLoading(true);
      setError(null);
      setNeedsPermission(false);

      if (isNative) {
        try {
          console.log('Loading installed apps storage...');
          
          // First, explicitly check if USAGE_ACCESS permission is granted
          let hasUsagePermission = false;
          try {
            const permCheck = await DeviceDiagnostics.checkUsageStatsPermission();
            hasUsagePermission = permCheck.granted;
            console.log('Usage stats permission:', hasUsagePermission);
          } catch (e) {
            console.log('Could not check usage permission:', e);
          }
          
          // Load apps and usage stats in parallel
          const [result, usageResult] = await Promise.all([
            DeviceDiagnostics.getInstalledAppsStorage(),
            DeviceDiagnostics.getAppUsageStats().catch((e) => {
              console.log('Usage stats not available:', e);
              return { stats: [], hasPermission: false };
            })
          ]);
          
          console.log('Apps result:', result);
          console.log('Usage result:', usageResult);
          
          // Build usage stats map
          const statsMap = new Map<string, AppUsageStat>();
          if (usageResult.stats) {
            usageResult.stats.forEach((stat: AppUsageStat) => {
              statsMap.set(stat.packageName, stat);
            });
          }
          setUsageStats(statsMap);
          
          // Get apps array from result
          const appsData = (result as any).apps || [];
          
          console.log('Apps data count:', appsData.length);
          
          if (appsData.length === 0) {
            setNeedsPermission(true);
            setError('no_apps');
            return;
          }
          
          setApps(appsData);
          
          // Analyze all apps with usage data
          const analyzed = appsData.map((app: AppStorageInfo) => {
            const analysis = analyzeApp(app);
            const usageStat = statsMap.get(app.packageName);
            return {
              ...analysis,
              usageMinutes: usageStat?.totalTimeMinutes || 0,
              lastUsed: usageStat?.lastTimeUsed || 0
            };
          });
          setAnalyzedApps(analyzed);
          
          // Check if we need to show permission warning
          // dataSizeMb will be 0 for all apps if USAGE_ACCESS is not granted
          const hasDataSizes = appsData.some((app: AppStorageInfo) => app.dataSizeMb > 0);
          const hasUsageData = usageResult.hasPermission && usageResult.stats?.length > 0;
          
          if (!hasUsagePermission || (!hasDataSizes && !hasUsageData)) {
            console.log('Missing detailed data - permission likely needed');
            setNeedsPermission(true);
            setError('need_usage_permission');
          }
        } catch (e: any) {
          console.error('Error loading apps:', e);
          if (e.message?.includes('not implemented') || e.message?.includes('not available')) {
            setError('plugin_not_installed');
          } else if (e.message?.includes('permission')) {
            setNeedsPermission(true);
            setError('permission_required');
          } else {
            setError(e.message || 'Errore nel caricamento delle app');
          }
        }
      } else {
        setError('web_platform');
      }
    } catch (e: any) {
      setError(e.message || 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const openAppSettings = async (packageName: string) => {
    try {
      await DeviceDiagnostics.openAppSettings({ packageName });
      toast.success('Aperte impostazioni app', {
        description: 'Qui puoi cancellare cache e dati'
      });
    } catch (e) {
      console.error('Error opening app settings:', e);
      toast.error('Impossibile aprire le impostazioni');
    }
  };

  const requestPermission = async () => {
    try {
      await DeviceDiagnostics.requestUsageStatsPermission();
      // After user grants permission, reload
      setTimeout(loadApps, 2000);
    } catch (e) {
      console.error('Error requesting permission:', e);
    }
  };

  const getRiskColor = (risk: AppAnalysis['riskLevel']) => {
    switch (risk) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      case 'low': return 'bg-green-500 text-white';
    }
  };

  const getRiskLabel = (risk: AppAnalysis['riskLevel']) => {
    switch (risk) {
      case 'critical': return 'Critico';
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'OK';
    }
  };

  const getStorageImpactColor = (impact: AppAnalysis['storageImpact']) => {
    switch (impact) {
      case 'extreme': return 'text-destructive';
      case 'heavy': return 'text-orange-500';
      case 'moderate': return 'text-amber-500';
      case 'minimal': return 'text-muted-foreground';
    }
  };

  // Filter and sort apps
  const filteredAndSortedApps = useMemo(() => {
    let filtered = [...analyzedApps];
    
    // Apply filter
    switch (filterBy) {
      case 'problems':
        filtered = filtered.filter(a => a.riskLevel !== 'low');
        break;
      case 'heavy':
        filtered = filtered.filter(a => a.app.totalSizeMb > 100);
        break;
      case 'unused':
        // Apps not used in 30 days or with 0 usage minutes
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(a => 
          (a.usageMinutes === 0 || a.usageMinutes === undefined) ||
          (a.lastUsed && a.lastUsed < thirtyDaysAgo)
        );
        break;
      case 'recent':
        // Apps used in the last 24 hours, sorted by last used
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        filtered = filtered.filter(a => a.lastUsed && a.lastUsed > oneDayAgo);
        filtered.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        break;
    }
    
    // Apply sort
    switch (sortBy) {
      case 'risk':
        filtered.sort((a, b) => {
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
          if (riskDiff !== 0) return riskDiff;
          return b.app.totalSizeMb - a.app.totalSizeMb;
        });
        break;
      case 'size':
        filtered.sort((a, b) => b.app.totalSizeMb - a.app.totalSizeMb);
        break;
      case 'usage':
        filtered.sort((a, b) => (b.usageMinutes || 0) - (a.usageMinutes || 0));
        break;
      case 'lastUsed':
        filtered.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        break;
    }
    
    return filtered;
  }, [analyzedApps, filterBy, sortBy]);

  const totalSize = apps.reduce((sum, app) => sum + app.totalSizeMb, 0);
  const problemApps = analyzedApps.filter(a => a.riskLevel !== 'low');
  const displayedApps = expanded ? filteredAndSortedApps : filteredAndSortedApps.slice(0, 8);

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp || timestamp === 0) return 'Mai usata';
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} settimane fa`;
    return `${Math.floor(days / 30)} mesi fa`;
  };

  const formatUsageTime = (minutes?: number) => {
    if (!minutes || minutes === 0) return '0 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Analizzando le app installate...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Web platform or plugin not installed - show instructions
  if (error === 'web_platform' || error === 'plugin_not_installed') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Analisi App Installate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700">Plugin Nativo Richiesto</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per analizzare le app reali installate sul dispositivo, è necessario il plugin nativo Android.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Segui le istruzioni in <code className="bg-muted px-1 py-0.5 rounded">android-plugin/INSTRUCTIONS.md</code> per installare il plugin.
                </p>
              </div>
            </div>
          </div>

          {/* Generic tips */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium">💡 Nel frattempo, controlla manualmente:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Vai in <strong>Impostazioni → App</strong> per vedere lo storage usato</li>
              <li>• Ordina per dimensione per trovare le app più pesanti</li>
              <li>• Svuota la cache di WhatsApp, Telegram, Instagram</li>
              <li>• Elimina app "cleaner" o "booster" - spesso inutili</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission required for storage details
  if (needsPermission && error === 'need_usage_permission') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            App Installate ({apps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">Permesso "Accesso all'utilizzo" Richiesto</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per vedere <strong>memoria e dati</strong> delle app, devi abilitare il permesso "Accesso all'utilizzo" per questa app.
                </p>
                <ol className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>1. Tocca il pulsante sotto</li>
                  <li>2. Trova <strong>LabLink Riparo</strong> nell'elenco</li>
                  <li>3. Attiva il permesso</li>
                  <li>4. Torna indietro e riprova</li>
                </ol>
              </div>
            </div>
          </div>
          
          <Button onClick={requestPermission} className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Apri Impostazioni Permessi
          </Button>

          <Button variant="outline" onClick={loadApps} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Ho attivato il permesso, Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  // General permission required
  if (needsPermission) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Analisi App Installate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Permesso Richiesto</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Per analizzare le dimensioni delle app, è necessario il permesso "Usage Access" nelle impostazioni di sistema.
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={requestPermission} className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Concedi Permesso
          </Button>

          <Button variant="outline" onClick={loadApps} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Riprova
          </Button>
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
            <Badge variant="secondary">
              {apps.length} app • {(totalSize / 1024).toFixed(1)} GB
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadApps}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Problem Summary */}
        {problemApps.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {problemApps.length} app con problemi rilevati
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {problemApps.filter(a => a.riskLevel === 'critical').length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {problemApps.filter(a => a.riskLevel === 'critical').length} critiche
                </Badge>
              )}
              {problemApps.filter(a => a.riskLevel === 'high').length > 0 && (
                <Badge className="text-xs bg-orange-500">
                  {problemApps.filter(a => a.riskLevel === 'high').length} alte
                </Badge>
              )}
              {problemApps.filter(a => a.riskLevel === 'medium').length > 0 && (
                <Badge className="text-xs bg-amber-500">
                  {problemApps.filter(a => a.riskLevel === 'medium').length} medie
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="flex gap-2">
          <Select value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filtra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le app</SelectItem>
              <SelectItem value="recent">Usate di recente</SelectItem>
              <SelectItem value="problems">Con problemi</SelectItem>
              <SelectItem value="heavy">Pesanti (&gt;100MB)</SelectItem>
              <SelectItem value="unused">Non usate</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Ordina" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk">Per rischio</SelectItem>
              <SelectItem value="size">Per dimensione</SelectItem>
              <SelectItem value="usage">Per utilizzo</SelectItem>
              <SelectItem value="lastUsed">Ultimo uso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Apps List */}
        <ScrollArea className={cn("pr-2", expanded ? "h-[400px]" : "")}>
          <div className="space-y-2 pr-2">
            {displayedApps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nessuna app trovata con questo filtro
              </p>
            ) : (
              displayedApps.map((analysis, index) => (
                <div
                  key={analysis.app.packageName + index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border bg-background",
                    analysis.riskLevel === 'critical' && "border-destructive/50 bg-destructive/5",
                    analysis.riskLevel === 'high' && "border-orange-500/50 bg-orange-500/5"
                  )}
                >
                  {/* App Icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted shrink-0 overflow-hidden">
                    {analysis.app.iconBase64 ? (
                      <img 
                        src={analysis.app.iconBase64} 
                        alt={analysis.app.appName || 'App'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {analysis.app.appName || analysis.app.packageName.split('.').pop()}
                      </p>
                      <Badge className={cn("text-[10px] h-4 px-1", getRiskColor(analysis.riskLevel))}>
                        {getRiskLabel(analysis.riskLevel)}
                      </Badge>
                      {analysis.app.isSystemApp && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          Sistema
                        </Badge>
                      )}
                    </div>
                    
                    {/* Issues */}
                    {analysis.issues.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {analysis.issues.slice(0, 2).map((issue, i) => (
                          <p key={i} className="text-xs text-amber-600 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Size breakdown + Usage */}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                      <span>App: {analysis.app.appSizeMb.toFixed(0)} MB</span>
                      <span>Dati: {analysis.app.dataSizeMb.toFixed(0)} MB</span>
                      {analysis.app.cacheSizeMb > 0 && (
                        <span className={analysis.app.cacheSizeMb > 50 ? 'text-amber-600' : ''}>
                          Cache: {analysis.app.cacheSizeMb.toFixed(0)} MB
                        </span>
                      )}
                    </div>
                    
                    {/* Usage stats */}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatUsageTime(analysis.usageMinutes)}
                      </span>
                      <span>{formatLastUsed(analysis.lastUsed)}</span>
                    </div>
                  </div>

                  {/* Actions + Size */}
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={cn(
                      "text-xs font-bold whitespace-nowrap",
                      getStorageImpactColor(analysis.storageImpact)
                    )}>
                      {analysis.app.totalSizeMb >= 1024 
                        ? `${(analysis.app.totalSizeMb / 1024).toFixed(1)} GB`
                        : `${analysis.app.totalSizeMb.toFixed(0)} MB`
                      }
                    </p>
                    
                    {/* Open Settings button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAppSettings(analysis.app.packageName);
                      }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Expand/Collapse */}
        {filteredAndSortedApps.length > 8 && (
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
                Mostra altre ({filteredAndSortedApps.length - 8})
              </>
            )}
          </Button>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={async () => {
            // Open device settings using plugin
            if (isNative) {
              try {
                await DeviceDiagnostics.openDeviceSettings();
              } catch (e) {
                console.error('Error opening device settings:', e);
                toast.error('Impossibile aprire le impostazioni');
              }
            }
          }}>
            <Settings className="h-3 w-3" />
            Impostazioni App
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={loadApps}>
            <RefreshCw className="h-3 w-3" />
            Aggiorna
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppStorageWidget;
