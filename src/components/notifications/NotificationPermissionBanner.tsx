import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationPermissionBanner() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Non mostrare se già concesso, negato, non supportato o dismissato
  if (!isSupported || permission !== "default" || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    await requestPermission();
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                Attiva le Notifiche Push
              </h3>
              <p className="text-sm text-muted-foreground">
                Ricevi avvisi istantanei per nuovi ritiri, ordini e appuntamenti
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDismissed(true)}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={loading}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                {loading ? "..." : "Attiva"}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
