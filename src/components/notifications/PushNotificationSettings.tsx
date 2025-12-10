import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

export function PushNotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe,
    sendLocalNotification 
  } = usePushNotifications();
  const [isToggling, setIsToggling] = useState(false);

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
            sendLocalNotification("Notifiche Attive! 🎉", {
              body: "Riceverai aggiornamenti sulle riparazioni anche quando l'app è chiusa",
              icon: "/pwa-192x192.png"
            });
          }, 1000);
        } else {
          if (permission === "denied") {
            toast.error("Notifiche bloccate dal browser. Abilita dalle impostazioni del browser.");
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
    if (permission === "denied") {
      return <Badge variant="destructive" className="gap-1"><BellOff className="h-3 w-3" /> Bloccate</Badge>;
    }
    if (isSubscribed) {
      return <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" /> Attive</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Bell className="h-3 w-3" /> Non attive</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
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
        {!isSupported ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Il tuo browser non supporta le notifiche push. Prova con Chrome, Firefox, Edge o Safari.
            </p>
          </div>
        ) : permission === "denied" ? (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
            <p className="text-sm text-destructive font-medium">
              Le notifiche sono state bloccate
            </p>
            <p className="text-xs text-muted-foreground">
              Per abilitarle, clicca sull'icona 🔒 nella barra degli indirizzi del browser e consenti le notifiche.
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
                      ? "Riceverai notifiche su nuovi lavori, appuntamenti e aggiornamenti importanti"
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
  );
}
