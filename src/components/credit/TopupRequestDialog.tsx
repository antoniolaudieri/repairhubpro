import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TopupRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "centro" | "corner";
  entityId: string;
  currentBalance: number;
  onSuccess?: () => void;
}

export function TopupRequestDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  currentBalance,
  onSuccess,
}: TopupRequestDialogProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "bank_transfer">("stripe");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for successful payment on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topupStatus = urlParams.get("topup");
    
    if (topupStatus === "success") {
      // Remove query param
      window.history.replaceState({}, "", window.location.pathname);
      
      // Confirm the payment
      const sessionId = sessionStorage.getItem("pending_topup_session");
      if (sessionId) {
        confirmStripePayment(sessionId);
        sessionStorage.removeItem("pending_topup_session");
      }
    } else if (topupStatus === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
      toast.info("Pagamento annullato");
    }
  }, []);

  const confirmStripePayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("confirm-topup-payment", {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Ricarica completata! Nuovo saldo: €${data.new_balance?.toFixed(2)}`);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      toast.error("Errore nella conferma del pagamento");
    }
  };

  const handleStripePayment = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      toast.error("L'importo minimo di ricarica è €50");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-topup-checkout", {
        body: {
          entity_type: entityType,
          entity_id: entityId,
          amount: numAmount,
          user_email: user?.email,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Store session ID for confirmation
        sessionStorage.setItem("pending_topup_session", data.session_id);
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Errore nella creazione del pagamento");
      setIsSubmitting(false);
    }
  };

  const handleBankTransfer = async () => {
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
        payment_method: "bank_transfer",
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

  const handleSubmit = () => {
    if (paymentMethod === "stripe") {
      handleStripePayment();
    } else {
      handleBankTransfer();
    }
  };

  const quickAmounts = [50, 100, 200, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Richiedi Ricarica Credito</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
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

          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "stripe" | "bank_transfer")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Carta</span>
              </TabsTrigger>
              <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Bonifico</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stripe" className="space-y-3 mt-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-sm">
                  <p className="text-muted-foreground">
                    Paga con carta di credito o debito. Il credito sarà disponibile immediatamente dopo il pagamento.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank_transfer" className="space-y-3 mt-4">
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
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {paymentMethod === "stripe" ? "Paga con Carta" : "Invia Richiesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
