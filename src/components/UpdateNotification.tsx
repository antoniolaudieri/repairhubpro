import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";

export const UpdateNotification = () => {
  const { needRefresh, updateServiceWorker } = useServiceWorkerUpdate();
  const [dismissed, setDismissed] = useState(false);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] mx-auto max-w-md animate-fade-in">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm">Nuova versione disponibile!</p>
          <p className="text-xs opacity-90">Aggiorna per ottenere le ultime novità.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={updateServiceWorker}
            className="gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aggiorna
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-8 w-8 hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
