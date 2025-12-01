import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignatureCanvas from "react-signature-canvas";
import { FileSignature, X, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface FinalCostSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: {
    id: string;
    final_cost: number;
    device: {
      brand: string;
      model: string;
      device_type: string;
    };
  };
  onSuccess: () => void;
}

export function FinalCostSignatureDialog({
  open,
  onOpenChange,
  repair,
  onSuccess,
}: FinalCostSignatureDialogProps) {
  const [loading, setLoading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSign = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error("Per favore, firma prima di accettare");
      return;
    }

    setLoading(true);
    try {
      const signatureData = sigCanvas.current.toDataURL();

      const { error } = await supabase
        .from("repairs")
        .update({
          final_cost_signature: signatureData,
          final_cost_accepted_at: new Date().toISOString(),
        })
        .eq("id", repair.id);

      if (error) throw error;

      toast.success("Costo finale accettato con successo!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Errore durante l'accettazione: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileSignature className="h-6 w-6 text-primary" />
            Accettazione Costo Finale
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Device Info */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg text-foreground">
                Dispositivo
              </h3>
              <p className="text-muted-foreground">
                {repair.device.brand} {repair.device.model} ({repair.device.device_type})
              </p>
            </div>
          </Card>

          {/* Final Cost */}
          <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/30">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Costo Finale Riparazione
              </p>
              <p className="text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                €{repair.final_cost.toFixed(2)}
              </p>
            </div>
          </Card>

          {/* Signature Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Firma per Accettare
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Cancella
              </Button>
            </div>
            
            <Card className="p-4 bg-card/50 backdrop-blur-sm border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: "w-full h-48 bg-background rounded-lg cursor-crosshair",
                }}
                backgroundColor="hsl(var(--background))"
                penColor="hsl(var(--primary))"
              />
            </Card>
            <p className="text-xs text-muted-foreground text-center">
              Firma nell'area sopra usando il mouse o il touch screen
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSign}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {loading ? "Accettazione..." : "Accetta e Firma"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Accettando questo costo, autorizzi il completamento della riparazione
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
