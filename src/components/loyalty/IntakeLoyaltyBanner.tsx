import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, Check, ArrowRight, Sparkles, QrCode, Loader2, ExternalLink } from "lucide-react";
import { useLoyaltyCard } from "@/hooks/useLoyaltyCard";
import { useLoyaltyProgramSettingsForCentro } from "@/hooks/useLoyaltyProgramSettings";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

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
  const { benefits, loading, createCheckout, activateWithBonifico, refresh } = useLoyaltyCard(customerId, centroId);
  const { settings, loading: settingsLoading, getEffectiveSettings } = useLoyaltyProgramSettingsForCentro(centroId);
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loyaltyCardId, setLoyaltyCardId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);

  // Get effective settings (custom or defaults)
  const effectiveSettings = getEffectiveSettings();
  const annualPrice = effectiveSettings.annual_price;
  const diagnosticFee = effectiveSettings.diagnostic_fee;
  const repairDiscountPercent = effectiveSettings.repair_discount_percent;
  const maxDevices = effectiveSettings.max_devices;
  const validityMonths = effectiveSettings.validity_months;
  
  // Calculate savings based on Centro's settings
  const baseDiagnosticFee = 15; // Standard fee without loyalty
  const diagnosticSavings = baseDiagnosticFee - diagnosticFee;
  const repairDiscount = estimatedCost * (repairDiscountPercent / 100);
  const totalPotentialSavings = diagnosticSavings + repairDiscount;

  // Platform commission
  const platformCommissionRate = 0.05; // 5%
  const platformCommission = annualPrice * platformCommissionRate;

  // Poll for payment completion
  useEffect(() => {
    if (!loyaltyCardId || !showQrDialog) return;

    setIsPolling(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('loyalty_cards')
        .select('status')
        .eq('id', loyaltyCardId)
        .single();

      if (data?.status === 'active') {
        clearInterval(interval);
        setIsPolling(false);
        setShowQrDialog(false);
        setShowProposalDialog(false);
        toast.success("Tessera fedeltà attivata con successo!");
        onDiagnosticFeeChange?.(diagnosticFee);
        refresh();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [loyaltyCardId, showQrDialog, onDiagnosticFeeChange, refresh, diagnosticFee]);

  if (loading || settingsLoading || !customerId) return null;

  const handleStripeCheckout = async () => {
    setProcessing(true);
    const result = await createCheckout(customerEmail);
    setProcessing(false);
    
    if (result?.url) {
      setCheckoutUrl(result.url);
      setLoyaltyCardId(result.loyalty_card_id);
      setDisplayPrice(result.annual_price || annualPrice);
      setShowProposalDialog(false);
      setShowQrDialog(true);
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
      onDiagnosticFeeChange?.(diagnosticFee);
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
                Diagnosi €{diagnosticFee} <span className="line-through text-xs">€{baseDiagnosticFee}</span>
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Sconto {repairDiscountPercent}% riparazioni
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
              {totalPotentialSavings > 0 && (
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs">
                  Risparmio €{totalPotentialSavings.toFixed(0)}+
                </Badge>
              )}
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                <div className="text-muted-foreground">Diagnosi oggi:</div>
                <div className="font-medium">
                  <span className="text-destructive line-through mr-1">€{baseDiagnosticFee}</span>
                  <span className="text-green-600">€{diagnosticFee}</span>
                </div>
              </div>
              
              {estimatedCost > 0 && (
                <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                  <div className="text-muted-foreground">Riparazione:</div>
                  <div className="font-medium">
                    <span className="text-destructive line-through mr-1">€{estimatedCost.toFixed(0)}</span>
                    <span className="text-green-600">€{(estimatedCost * (1 - repairDiscountPercent / 100)).toFixed(0)}</span>
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
                Attiva per €{annualPrice}/anno
                <ArrowRight className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {maxDevices} dispositivi coperti
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Tessera Fedeltà
            </DialogTitle>
            <DialogDescription>
              Attiva la tessera fedeltà per il cliente - €{annualPrice}/anno
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
              <h4 className="font-semibold mb-2">Vantaggi inclusi:</h4>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Diagnosi €{diagnosticFee} invece di €{baseDiagnosticFee} (risparmio €{diagnosticSavings})
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Sconto {repairDiscountPercent}% su tutte le riparazioni
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Copertura fino a {maxDevices} dispositivi
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Validità {validityMonths} mesi
                </li>
              </ul>
            </Card>
            
            <div className="space-y-2">
              <Button 
                className="w-full gap-2" 
                onClick={handleStripeCheckout}
                disabled={processing}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                {processing ? "Generazione QR..." : `💳 Genera QR Pagamento (€${annualPrice})`}
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
                Commissione piattaforma: €{platformCommission.toFixed(2)} (5%)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Payment Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <QrCode className="h-5 w-5 text-primary" />
              Scansiona per Pagare
            </DialogTitle>
            <DialogDescription className="text-center">
              Il cliente può scansionare il QR con il telefono per completare il pagamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {checkoutUrl && (
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={checkoutUrl} 
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            )}
            
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">€{(displayPrice || annualPrice).toFixed(2).replace('.', ',')}</p>
              <p className="text-sm text-muted-foreground">Tessera Fedeltà Annuale</p>
            </div>

            {isPolling && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                In attesa del pagamento...
              </div>
            )}

            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 gap-1"
                onClick={() => checkoutUrl && window.open(checkoutUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Apri Link
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1"
                onClick={() => setShowQrDialog(false)}
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
