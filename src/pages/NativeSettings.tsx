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
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useUnifiedPushNotifications } from "@/hooks/useUnifiedPushNotifications";

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

  // Check if permission was denied (not granted and not loading)
  const permissionDenied = !isGranted && !isLoading && isSupported;

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
