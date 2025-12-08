import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Phone, Mail, Send, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface Corner {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  distance?: number;
}

interface PartnershipInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corner: Corner;
  centroId: string;
  onInviteSent: () => void;
}

export function PartnershipInviteDialog({
  open,
  onOpenChange,
  corner,
  centroId,
  onInviteSent,
}: PartnershipInviteDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendInvite = async () => {
    setSending(true);
    try {
      // Create invite record
      const { data: invite, error: insertError } = await supabase
        .from("partnership_invites")
        .insert({
          from_type: "centro",
          from_id: centroId,
          to_type: "corner",
          to_id: corner.id,
          message: message.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          toast.error("Hai già inviato una richiesta a questo Corner");
        } else {
          throw insertError;
        }
        return;
      }

      // Send email via edge function
      const { error: emailError } = await supabase.functions.invoke(
        "send-partnership-invite",
        {
          body: {
            inviteId: invite.id,
            fromType: "centro",
            fromId: centroId,
            toType: "corner",
            toId: corner.id,
            message: message.trim(),
          },
        }
      );

      if (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the whole operation, invite is still saved
        toast.warning("Richiesta salvata, ma l'email potrebbe non essere arrivata");
      } else {
        toast.success("Richiesta di partnership inviata!");
      }

      setSent(true);
      setTimeout(() => {
        onInviteSent();
        setSent(false);
        setMessage("");
      }, 1500);
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[9999]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Invia Richiesta di Partnership
          </DialogTitle>
          <DialogDescription>
            Invita questo Corner a collaborare con il tuo Centro Assistenza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Corner Info */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Store className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{corner.business_name}</h3>
                  {corner.distance !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {corner.distance.toFixed(1)} km
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1 mt-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {corner.address}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {corner.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {corner.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Vantaggi della partnership:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Ricevi riparazioni dai clienti del Corner</li>
              <li>✓ Il Corner guadagna una commissione su ogni lavoro</li>
              <li>✓ Espandi la tua rete senza costi aggiuntivi</li>
            </ul>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Messaggio personale (opzionale)</Label>
            <Textarea
              id="message"
              placeholder="Presentati e spiega perché vorresti collaborare..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Il messaggio verrà incluso nell'email di invito
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annulla
          </Button>
          <Button onClick={handleSendInvite} disabled={sending || sent} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Invio in corso...
              </>
            ) : sent ? (
              <>
                <Check className="h-4 w-4" />
                Inviato!
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Invia Richiesta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
