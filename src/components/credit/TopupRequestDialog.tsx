import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Banknote, Building2, Loader2 } from "lucide-react";

interface TopupRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "centro" | "corner";
  entityId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

const PAYMENT_METHOD = { value: "bank_transfer", label: "Bonifico Bancario", icon: Building2 };

export function TopupRequestDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  currentBalance,
  onSuccess,
}: TopupRequestDialogProps) {
  const [amount, setAmount] = useState("");
  const paymentMethod = "bank_transfer";
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      toast.error("L'importo minimo di ricarica è €50");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("topup_requests").insert({
        entity_type: entityType,
        entity_id: entityId,
        amount: numAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        notes: notes || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Richiesta di ricarica inviata! Riceverai conferma a breve.");
      setAmount("");
      setPaymentReference("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating topup request:", error);
      toast.error("Errore nell'invio della richiesta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [50, 100, 200, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Richiedi Ricarica Credito</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto">
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Saldo attuale</span>
                <span className={`font-semibold ${currentBalance < 0 ? "text-destructive" : ""}`}>
                  €{currentBalance.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Importo ricarica (min. €50)</Label>
            <Input
              type="number"
              placeholder="100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={50}
              step={10}
            />
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(amt.toString())}
                >
                  €{amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Metodo di pagamento</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Bonifico Bancario</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Riferimento pagamento (CRO/TRN)</Label>
            <Input
              placeholder="Inserisci il codice del bonifico"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Textarea
              placeholder="Eventuali note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-sm space-y-2">
              <p className="font-semibold text-primary">Coordinate bancarie:</p>
              <div className="space-y-1 font-mono text-xs bg-background/50 p-3 rounded-md">
                <p><span className="text-muted-foreground">IBAN:</span> IT32D0200810500000420425905</p>
                <p><span className="text-muted-foreground">Intestato a:</span> Riccardo Casagrande</p>
              </div>
              <p className="text-muted-foreground text-xs mt-3">
                Inserisci come causale: <span className="font-medium text-foreground">"Ricarica credito - {entityType === "centro" ? "Centro" : "Corner"}"</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Invia Richiesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
