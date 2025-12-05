import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  onSuccess: () => void;
}

export function SignatureDialog({ open, onOpenChange, quoteId, onSuccess }: SignatureDialogProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(false);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = async () => {
    if (sigCanvas.current?.isEmpty()) {
      toast({
        title: "Firma richiesta",
        description: "Per favore firma prima di continuare",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const signatureData = sigCanvas.current?.toDataURL();

      const { error } = await supabase
        .from("quotes")
        .update({
          status: "accepted",
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
        })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Preventivo firmato!",
        description: "Il preventivo è stato accettato con successo",
      });

      // Await onSuccess to ensure data is refreshed before closing
      await onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "rejected" })
        .eq("id", quoteId);

      if (error) throw error;

      toast({
        title: "Preventivo rifiutato",
        description: "Il preventivo è stato rifiutato",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Firma Preventivo</DialogTitle>
          <DialogDescription>
            Firma nell'area sottostante per accettare il preventivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-64 touch-action-none",
              }}
              backgroundColor="white"
            />
          </div>

          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={clearSignature}
              size="sm"
            >
              Cancella
            </Button>

            <p className="text-xs text-muted-foreground">
              Firma con il dito o il mouse
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Rifiuta
            </Button>
            <Button
              onClick={handleSign}
              disabled={loading}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading ? "Invio..." : "Accetta e Firma"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
