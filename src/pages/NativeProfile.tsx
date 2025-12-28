import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  LogOut,
  Bell,
  BellRing,
  Shield,
  Info,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Mail,
  CreditCard,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { APP_VERSION } from "@/config/appVersion";

interface LoyaltyCard {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string;
  card_number?: string;
  activated_at?: string;
  expires_at?: string;
  centro?: {
    business_name: string;
    logo_url?: string;
  };
}

interface NativeProfileProps {
  user: User;
  loyaltyCard: LoyaltyCard | null;
  onOpenSettings?: () => void;
}

export const NativeProfile = ({ user, loyaltyCard, onOpenSettings }: NativeProfileProps) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const pushNotifications = usePushNotifications();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      toast.success("Disconnesso con successo");
    } catch (error) {
      toast.error("Errore durante la disconnessione");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleEnablePush = async () => {
    const success = await pushNotifications.subscribe();
    if (success) {
      toast.success("Notifiche push attivate!", {
        description: "Riceverai aggiornamenti anche quando l'app è chiusa",
      });
    } else {
      toast.error("Impossibile attivare le notifiche", {
        description: "Controlla i permessi nelle impostazioni del dispositivo",
      });
    }
  };

  const menuItems = [
    {
      icon: Bell,
      label: "Notifiche Push",
      description: pushNotifications.isSubscribed ? "Attive" : "Disattivate",
      action: handleEnablePush,
      toggle: true,
      enabled: pushNotifications.isSubscribed,
    },
    {
      icon: CreditCard,
      label: "Tessera Fedeltà",
      description: loyaltyCard?.card_number || "Non attiva",
      badge: loyaltyCard?.status === "active" ? "Attiva" : undefined,
    },
    {
      icon: Shield,
      label: "Privacy e Sicurezza",
      description: "Gestisci i tuoi dati",
      chevron: true,
    },
    {
      icon: HelpCircle,
      label: "Assistenza",
      description: "Centro supporto",
      chevron: true,
    },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-24 space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-primary to-primary/80" />
            <CardContent className="pt-0 relative">
              <div className="flex items-end gap-4 -mt-8">
                <div className="h-16 w-16 rounded-full bg-background border-4 border-background shadow-lg flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="pb-2">
                  <p className="font-semibold text-lg">
                    {user.user_metadata?.full_name || user.email?.split("@")[0] || "Utente"}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loyalty Card Info */}
        {loyaltyCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{loyaltyCard.centro?.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Tessera #{loyaltyCard.card_number?.slice(-6) || "--"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Attiva</Badge>
                </div>
                {loyaltyCard.expires_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Scadenza: {new Date(loyaltyCard.expires_at).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  {index > 0 && <Separator />}
                  <button
                    onClick={item.toggle ? item.action : undefined}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.toggle && (
                        <Switch checked={item.enabled} />
                      )}
                      {item.chevron && (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="destructive"
            className="w-full h-12"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {loggingOut ? "Disconnessione..." : "Esci"}
          </Button>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground space-y-1"
        >
          <p className="flex items-center justify-center gap-1">
            <Smartphone className="h-3 w-3" />
            Device Health Monitor
          </p>
          <p>Versione {APP_VERSION}</p>
        </motion.div>
      </div>
    </ScrollArea>
  );
};
