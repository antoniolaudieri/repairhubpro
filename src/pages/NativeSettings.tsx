import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Bell, 
  BellOff, 
  BellRing, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Smartphone,
  Settings,
  Info,
  Shield,
  Trash2,
  HardDrive,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useUnifiedPushNotifications } from "@/hooks/useUnifiedPushNotifications";
import { Capacitor } from "@capacitor/core";
import DeviceDiagnostics, { CacheInfo } from "@/plugins/DeviceStoragePlugin";

interface NativeSettingsProps {
  user: User;
  onBack: () => void;
}

const NativeSettings = ({ user, onBack }: NativeSettingsProps) => {
  const pushNotifications = useUnifiedPushNotifications();
  const { 
    isSupported, 
    isGranted,
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe,
    sendLocalNotification 
  } = pushNotifications;
  const [isToggling, setIsToggling] = useState(false);
  
  // Cache management state
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Check if permission was denied (not granted and not loading)
  const permissionDenied = !isGranted && !isLoading && isSupported;

  // Load cache info on mount
  useEffect(() => {
    if (isNative) {
      loadCacheInfo();
    }
  }, [isNative]);

  const loadCacheInfo = async () => {
    setIsLoadingCache(true);
    try {
      const info = await DeviceDiagnostics.getTotalCacheSize();
      setCacheInfo(info);
    } catch (error) {
      console.error("Error loading cache info:", error);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleOpenStorageSettings = async () => {
    try {
      const result = await DeviceDiagnostics.openStorageSettings();
      if (result.opened) {
        toast.success("Impostazioni storage aperte", {
          description: "Seleziona 'Libera spazio' per pulire la cache"
        });
      }
    } catch (error) {
      console.error("Error opening storage settings:", error);
      toast.error("Impossibile aprire le impostazioni");
    }
  };

  const handleClearOwnCache = async () => {
    setIsClearing(true);
    try {
      const result = await DeviceDiagnostics.clearAppCache();
      if (result.success) {
        toast.success(`Cache app pulita!`, {
          description: `Liberati ${result.freedMb.toFixed(2)} MB`
        });
        // Reload cache info
        await loadCacheInfo();
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

  const handleToggleNotifications = async () => {
    setIsToggling(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          toast.success("Notifiche push disabilitate");
        } else {
          toast.error("Errore nella disabilitazione");
        }
      } else {
        const success = await subscribe();
        if (success) {
          toast.success("Notifiche push abilitate!");
          // Send a test notification
          setTimeout(() => {
            sendLocalNotification(
              "Notifiche Attive! 🎉", 
              "Riceverai aggiornamenti sulle riparazioni e manutenzioni anche quando l'app è chiusa"
            );
          }, 1000);
        } else {
          if (permissionDenied) {
            toast.error("Notifiche bloccate dal sistema", {
              description: "Vai nelle impostazioni del dispositivo per abilitarle",
            });
          } else {
            toast.error("Errore nell'attivazione delle notifiche");
          }
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error);
      toast.error("Errore imprevisto");
    } finally {
      setIsToggling(false);
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Non supportato</Badge>;
    }
    if (permissionDenied && !isSubscribed) {
      return <Badge variant="destructive" className="gap-1"><BellOff className="h-3 w-3" /> Bloccate</Badge>;
    }
    if (isSubscribed) {
      return <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" /> Attive</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Bell className="h-3 w-3" /> Non attive</Badge>;
  };

  const formatCacheSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Impostazioni</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Cache Management Card - Only on Native */}
        {isNative && (
          <Card className="border-border/50 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 p-1">
              <CardHeader className="bg-background rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                      <Trash2 className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Pulizia Cache</CardTitle>
                      <CardDescription>
                        Libera spazio eliminando file temporanei
                      </CardDescription>
                    </div>
                  </div>
                  {cacheInfo && (
                    <Badge variant="secondary" className="font-mono">
                      {formatCacheSize(cacheInfo.totalCacheMb)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </div>
            <CardContent className="space-y-4 pt-4">
              {isLoadingCache ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Cache Info */}
                  <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                    <div className="flex items-start gap-3">
                      <HardDrive className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">Cache Sistema</p>
                        <p className="text-xs text-muted-foreground">
                          {cacheInfo ? (
                            <>
                              Analizzate {cacheInfo.appsScanned} app. 
                              Cache totale: <span className="font-medium text-foreground">{formatCacheSize(cacheInfo.totalCacheMb)}</span>
                            </>
                          ) : (
                            "Premi il pulsante per analizzare la cache"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        La pulizia cache non elimina dati personali, foto o file importanti. 
                        Rimuove solo file temporanei che verranno ricreati automaticamente.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      onClick={handleOpenStorageSettings}
                      variant="default"
                      className="w-full gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Apri Gestione Storage
                    </Button>
                    
                    <Button 
                      onClick={handleClearOwnCache}
                      disabled={isClearing}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      {isClearing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Pulizia in corso...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Pulisci Cache App
                        </>
                      )}
                    </Button>

                    <Button 
                      onClick={loadCacheInfo}
                      disabled={isLoadingCache}
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground"
                    >
                      {isLoadingCache ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Aggiorna informazioni cache
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Push Notifications Card */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BellRing className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notifiche Push</CardTitle>
                  <CardDescription>
                    Ricevi notifiche anche quando l'app è chiusa
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !isSupported ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  Il tuo dispositivo non supporta le notifiche push.
                </p>
              </div>
            ) : permissionDenied && !isSubscribed ? (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
                <p className="text-sm text-destructive font-medium">
                  Le notifiche sono state bloccate
                </p>
                <p className="text-xs text-muted-foreground">
                  Per abilitarle, vai nelle Impostazioni del dispositivo → App → RepairHubPro → Notifiche
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-accent/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {isSubscribed ? "Dispositivo registrato" : "Registra questo dispositivo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isSubscribed 
                          ? "Riceverai notifiche su prenotazioni, manutenzioni e aggiornamenti importanti"
                          : "Abilita le notifiche per ricevere aggiornamenti in tempo reale"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleToggleNotifications}
                  disabled={isToggling}
                  variant={isSubscribed ? "outline" : "default"}
                  className="w-full"
                >
                  {isToggling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isSubscribed ? "Disabilitazione..." : "Abilitazione..."}
                    </>
                  ) : isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Disabilita Notifiche
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Abilita Notifiche Push
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Benefits Card */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-lg">Cosa riceverai</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Conferme Prenotazioni</p>
                  <p className="text-xs text-muted-foreground">Quando il centro conferma il tuo appuntamento</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Promemoria Manutenzione</p>
                  <p className="text-xs text-muted-foreground">Avvisi basati sulla salute del dispositivo</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Stato Riparazioni</p>
                  <p className="text-xs text-muted-foreground">Aggiornamenti sullo stato delle tue riparazioni</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Offerte Speciali</p>
                  <p className="text-xs text-muted-foreground">Promozioni e sconti esclusivi</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Privacy Card */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <CardTitle className="text-lg">Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Le tue notifiche sono sicure e private. Non condividiamo i tuoi dati con terze parti 
              e puoi disattivare le notifiche in qualsiasi momento.
            </p>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{user.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NativeSettings;
