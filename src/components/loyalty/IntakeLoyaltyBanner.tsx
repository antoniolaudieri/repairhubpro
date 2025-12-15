import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, Check, ArrowRight, Sparkles } from "lucide-react";
import { useLoyaltyCard } from "@/hooks/useLoyaltyCard";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface IntakeLoyaltyBannerProps {
  customerId: string | null;
  centroId: string | null;
  customerEmail?: string;
  estimatedCost?: number;
  onDiagnosticFeeChange?: (fee: number) => void;
}

export function IntakeLoyaltyBanner({
  customerId,
  centroId,
  customerEmail,
  estimatedCost = 0,
  onDiagnosticFeeChange,
}: IntakeLoyaltyBannerProps) {
  const { benefits, loading, createCheckout, activateWithBonifico } = useLoyaltyCard(customerId, centroId);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (loading || !customerId) return null;

  // Calculate savings with loyalty card
  const diagnosticSavings = 5; // €15 - €10 = €5
  const repairDiscount = estimatedCost * 0.10; // 10% of repair
  const totalPotentialSavings = diagnosticSavings + repairDiscount;

  const handleStripeCheckout = async () => {
    setProcessing(true);
    const result = await createCheckout(customerEmail);
    setProcessing(false);
    
    if (result?.url) {
      window.open(result.url, '_blank');
      setShowProposalDialog(false);
      toast.success("Pagamento Stripe aperto in nuova finestra");
    } else {
      toast.error("Errore nella creazione del pagamento");
    }
  };

  const handleBonificoActivation = async () => {
    setProcessing(true);
    const success = await activateWithBonifico();
    setProcessing(false);
    
    if (success) {
      toast.success("Tessera fedeltà attivata con bonifico!");
      setShowProposalDialog(false);
      // Apply the reduced diagnostic fee
      onDiagnosticFeeChange?.(10);
    } else {
      toast.error("Errore nell'attivazione");
    }
  };

  // Customer has active loyalty card
  if (benefits.hasActiveCard) {
    return (
      <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Cliente Fedeltà</span>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                Attiva
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Diagnosi €10 <span className="line-through text-xs">€15</span>
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Sconto 10% riparazioni
              </span>
              <span className="text-xs">
                ({benefits.devicesUsed}/{benefits.maxDevices} dispositivi usati)
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Customer doesn't have loyalty card - show proposal
  return (
    <>
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 border-dashed">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">Proponi Tessera Fedeltà</span>
              <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs">
                Risparmio €{totalPotentialSavings.toFixed(0)}+
              </Badge>
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                <div className="text-muted-foreground">Diagnosi oggi:</div>
                <div className="font-medium">
                  <span className="text-destructive line-through mr-1">€15</span>
                  <span className="text-green-600">€10</span>
                </div>
              </div>
              
              {estimatedCost > 0 && (
                <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                  <div className="text-muted-foreground">Riparazione:</div>
                  <div className="font-medium">
                    <span className="text-destructive line-through mr-1">€{estimatedCost.toFixed(0)}</span>
                    <span className="text-green-600">€{(estimatedCost * 0.9).toFixed(0)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => setShowProposalDialog(true)}
                className="gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Attiva per €30/anno
                <ArrowRight className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">
                3 dispositivi coperti
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Tessera Fedeltà
            </DialogTitle>
            <DialogDescription>
              Attiva la tessera fedeltà per il cliente - €30/anno
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
              <h4 className="font-semibold mb-2">Vantaggi inclusi:</h4>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Diagnosi €10 invece di €15 (risparmio €5)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Sconto 10% su tutte le riparazioni
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Copertura fino a 3 dispositivi
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Validità 12 mesi
                </li>
              </ul>
            </Card>
            
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={handleStripeCheckout}
                disabled={processing}
              >
                {processing ? "Elaborazione..." : "💳 Paga con Carta (€30)"}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleBonificoActivation}
                disabled={processing}
              >
                {processing ? "Attivazione..." : "🏦 Pagamento Contanti/Bonifico"}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Commissione piattaforma: €1.50 (5%)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
