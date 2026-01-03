import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bell, Loader2, Mail, Users, Send } from "lucide-react";

interface NotifyInterestedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: {
    id: string;
    brand: string;
    model: string;
    price: number;
    device_type: string;
  };
  matchingInterests: number;
}

export function NotifyInterestedDialog({ 
  open, 
  onOpenChange, 
  device, 
  matchingInterests 
}: NotifyInterestedDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  const handleNotify = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-device-interest', {
        body: { 
          device_id: device.id,
          custom_message: customMessage || undefined
        }
      });

      if (error) throw error;

      toast({ 
        title: "Notifiche inviate!", 
        description: `${data?.emailsSent || 0} email inviate ai clienti interessati.`
      });
      
      setCustomMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error notifying interests:", error);
      toast({ 
        title: "Errore", 
        description: "Impossibile inviare le notifiche", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifica Interessati
          </DialogTitle>
          <DialogDescription>
            Invia una notifica a tutti i clienti interessati a dispositivi simili
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">{device.brand} {device.model}</p>
            <p className="text-lg font-bold text-primary">€{device.price}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">{matchingInterests}</span>
              <span className="text-sm text-muted-foreground">clienti interessati</span>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm">
              Messaggio personalizzato (opzionale)
            </Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Aggiungi un messaggio personalizzato alla notifica..."
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Lascia vuoto per usare il messaggio standard con i dettagli del dispositivo.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleNotify} 
              disabled={loading || matchingInterests === 0}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Invia a {matchingInterests} clienti
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
