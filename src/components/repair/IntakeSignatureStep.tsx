import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileSignature, X, Euro, Shield, CheckCircle2, Gift, CreditCard, Wallet, Tablet, Smartphone, QrCode, Copy, ExternalLink, Loader2, Wifi, Scale, Sparkles, ArrowRight, Check, Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import SignatureCanvas from "react-signature-canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface MarketingConsents {
  marketing_consent: boolean;
  email_consent: boolean;
  sms_consent: boolean;
}

interface IntakeSignatureStepProps {
  onSignatureComplete: (signatureData: string) => void;
  currentSignature: string | null;
  estimatedCost?: number;
  partsTotal?: number;
  servicesTotal?: number;
  /** The original services total before loyalty discount */
  originalServicesTotal?: number;
  laborTotal?: number;
  /** The original labor total before loyalty discount */
  originalLaborTotal?: number;
  shippingCost?: number;
  diagnosticFee?: number;
  /** The original diagnostic fee to display when switching diagnosticFee to 0 (e.g. €15 or €10 for loyalty). */
  baseDiagnosticFee?: number;
  onDiagnosticFeeChange?: (fee: number) => void;
  isFeeDisabledBySettings?: boolean;
  acconto?: number;
  onAccontoChange?: (acconto: number) => void;
  paymentMode?: "full" | "partial";
  onPaymentModeChange?: (mode: "full" | "partial") => void;
  externalPrivacyConsent?: boolean;
  onPrivacyConsentChange?: (consent: boolean) => void;
  /** Marketing consents */
  marketingConsents?: MarketingConsents;
  onMarketingConsentsChange?: (consents: MarketingConsents) => void;
  /** Loyalty card activation props */
  showLoyaltyProposal?: boolean;
  customerId?: string | null;
  centroId?: string | null;
  customerEmail?: string;
  onLoyaltyActivated?: () => void;
  /** Called when Centro applies loyalty discount as incentive (before card activation) */
  onApplyLoyaltyIncentive?: () => void;
}

export function IntakeSignatureStep({ 
  onSignatureComplete, 
  currentSignature,
  estimatedCost = 0,
  partsTotal = 0,
  servicesTotal = 0,
  originalServicesTotal,
  laborTotal = 0,
  originalLaborTotal,
  shippingCost = 0,
  diagnosticFee = 15,
  baseDiagnosticFee = 15,
  onDiagnosticFeeChange,
  isFeeDisabledBySettings = false,
  acconto = 0,
  onAccontoChange,
  paymentMode: controlledPaymentMode,
  onPaymentModeChange,
  externalPrivacyConsent,
  onPrivacyConsentChange,
  marketingConsents,
  onMarketingConsentsChange,
  showLoyaltyProposal = false,
  customerId,
  centroId,
  customerEmail,
  onLoyaltyActivated,
  onApplyLoyaltyIncentive,
}: IntakeSignatureStepProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [internalPaymentMode, setInternalPaymentMode] = useState<"full" | "partial">("full");
  const paymentMode = controlledPaymentMode ?? internalPaymentMode;
  
  const handlePaymentModeChange = (mode: "full" | "partial") => {
    setInternalPaymentMode(mode);
    onPaymentModeChange?.(mode);
  };
  const [showRemoteSignDialog, setShowRemoteSignDialog] = useState(false);
  const [remoteSignUrl, setRemoteSignUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isWaitingForRemoteSign, setIsWaitingForRemoteSign] = useState(false);
  const [internalPrivacyConsent, setInternalPrivacyConsent] = useState(false);
  
  // Loyalty card activation states
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [showLoyaltyQrDialog, setShowLoyaltyQrDialog] = useState(false);
  const [loyaltyProcessing, setLoyaltyProcessing] = useState(false);
  const [loyaltyCheckoutUrl, setLoyaltyCheckoutUrl] = useState<string | null>(null);
  const [loyaltyCardId, setLoyaltyCardId] = useState<string | null>(null);
  const [isPollingLoyalty, setIsPollingLoyalty] = useState(false);
  
  // Use external privacy consent if provided, otherwise use internal state
  const privacyConsent = externalPrivacyConsent !== undefined ? externalPrivacyConsent : internalPrivacyConsent;
  
  const setPrivacyConsent = (value: boolean) => {
    setInternalPrivacyConsent(value);
    onPrivacyConsentChange?.(value);
  };
  
  // Calculate potential savings with loyalty card
  const potentialLaborSavings = laborTotal * 0.10;
  const potentialServicesSavings = servicesTotal * 0.10;
  const potentialDiagnosticSavings = baseDiagnosticFee === 15 ? 5 : 0;
  const totalPotentialSavings = potentialLaborSavings + potentialServicesSavings + potentialDiagnosticSavings;
  
  // Calculate what the total would be WITH the loyalty card
  const currentTotalForLoyalty = partsTotal + laborTotal + servicesTotal + baseDiagnosticFee;
  const loyaltyDiscountedTotal = partsTotal + (laborTotal * 0.90) + (servicesTotal * 0.90) + 10; // €10 diagnostic fee with loyalty
  
  // Poll for loyalty payment completion
  useEffect(() => {
    if (!loyaltyCardId || !showLoyaltyQrDialog) return;

    setIsPollingLoyalty(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('loyalty_cards')
        .select('status')
        .eq('id', loyaltyCardId)
        .single();

      if (data?.status === 'active') {
        clearInterval(interval);
        setIsPollingLoyalty(false);
        setShowLoyaltyQrDialog(false);
        setShowLoyaltyDialog(false);
        toast.success("Tessera fedeltà attivata con successo!");
        onLoyaltyActivated?.();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      setIsPollingLoyalty(false);
    };
  }, [loyaltyCardId, showLoyaltyQrDialog, onLoyaltyActivated]);
  
  const handleLoyaltyStripeCheckout = async () => {
    if (!customerId || !centroId) return;
    
    setLoyaltyProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-loyalty-checkout', {
        body: { customerId, centroId, customerEmail }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        setLoyaltyCheckoutUrl(data.url);
        setLoyaltyCardId(data.loyalty_card_id);
        setShowLoyaltyDialog(false);
        setShowLoyaltyQrDialog(true);
      }
    } catch (err: any) {
      toast.error("Errore nella creazione del pagamento");
      console.error(err);
    } finally {
      setLoyaltyProcessing(false);
    }
  };
  
  const handleLoyaltyBonifico = async () => {
    if (!customerId || !centroId) return;
    
    setLoyaltyProcessing(true);
    try {
      // Create and immediately activate loyalty card for bonifico
      const { data, error } = await supabase
        .from('loyalty_cards')
        .insert({
          customer_id: customerId,
          centro_id: centroId,
          payment_method: 'bonifico',
          amount_paid: 30,
          platform_commission: 1.50,
          centro_revenue: 28.50,
          status: 'active',
          activated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          bonifico_confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Note: Platform commission deduction would be handled separately if needed
      
      toast.success("Tessera fedeltà attivata con bonifico!");
      setShowLoyaltyDialog(false);
      onLoyaltyActivated?.();
    } catch (err: any) {
      toast.error("Errore nell'attivazione: " + err.message);
      console.error(err);
    } finally {
      setLoyaltyProcessing(false);
    }
  };
  
  // Suggerimento sconto diagnosi per preventivi sopra €100
  const suggestDiscount = estimatedCost >= 100;
  const isDiscounted = diagnosticFee === 0;

  const totalWithDiagnostic = Math.ceil(estimatedCost + diagnosticFee);
  
  // Calculate what customer pays now based on payment mode
  const amountDueNow = paymentMode === "full" ? totalWithDiagnostic : (acconto || diagnosticFee);
  const remainingBalance = paymentMode === "full" ? 0 : (totalWithDiagnostic - amountDueNow);

  // Listen for remote signature via Supabase Realtime
  useEffect(() => {
    if (!currentSessionId) return;

    const channel = supabase.channel(`signature-${currentSessionId}`);
    
    channel
      .on('broadcast', { event: 'signature_completed' }, (payload) => {
        console.log('Remote signature received:', payload);
        const { signatureData } = payload.payload;
        
        if (signatureData) {
          // Close dialog and apply signature
          setShowRemoteSignDialog(false);
          setIsWaitingForRemoteSign(false);
          onSignatureComplete(signatureData);
          toast.success("Firma ricevuta dal dispositivo remoto!");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSessionId, onSignatureComplete]);

  const generateRemoteSignUrl = () => {
    setIsGeneratingLink(true);
    // Generate a unique session ID for this signature request
    const sessionId = crypto.randomUUID();
    setCurrentSessionId(sessionId);
    
    // Create a URL that can be opened on another device
    const baseUrl = window.location.origin;
    const signUrl = `${baseUrl}/firma-remota/${sessionId}?amount=${amountDueNow.toFixed(2)}&total=${totalWithDiagnostic.toFixed(2)}`;
    
    // Store session info in localStorage for cross-device sync
    localStorage.setItem(`remote-sign-${sessionId}`, JSON.stringify({
      timestamp: Date.now(),
      amount: amountDueNow,
      total: totalWithDiagnostic,
      status: 'pending'
    }));
    
    setTimeout(() => {
      setRemoteSignUrl(signUrl);
      setIsGeneratingLink(false);
      setShowRemoteSignDialog(true);
      setIsWaitingForRemoteSign(true);
    }, 500);
  };

  const copyToClipboard = async () => {
    if (remoteSignUrl) {
      await navigator.clipboard.writeText(remoteSignUrl);
      toast.success("Link copiato negli appunti!");
    }
  };

  const openInNewTab = () => {
    if (remoteSignUrl) {
      window.open(remoteSignUrl, '_blank');
    }
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL();
      onSignatureComplete(signatureData);
    }
  };
  
  const toggleDiagnosticDiscount = () => {
    if (onDiagnosticFeeChange) {
      onDiagnosticFeeChange(isDiscounted ? baseDiagnosticFee : 0);
    }
  };


  const handlePaymentModeSelect = (mode: "full" | "partial") => {
    handlePaymentModeChange(mode);
    if (mode === "full" && onAccontoChange) {
      onAccontoChange(totalWithDiagnostic);
    } else if (mode === "partial" && onAccontoChange) {
      // Default partial to diagnostic fee minimum
      onAccontoChange(diagnosticFee);
    }
  };

  const handleAccontoInputChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(Math.max(numValue, diagnosticFee), totalWithDiagnostic);
    if (onAccontoChange) {
      onAccontoChange(clampedValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Estimated Cost Card - Main focus for customer signature */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4 md:p-5 border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center mb-4">
            <h3 className="text-sm md:text-base font-bold text-foreground mb-1">
              Preventivo Iniziale
            </h3>
            <p className="text-xs text-muted-foreground">
              Importo stimato per la riparazione
            </p>
          </div>
          
          <div className="text-center mb-4">
            <span className="text-3xl md:text-4xl font-bold text-primary">
              €{totalWithDiagnostic.toFixed(2)}
            </span>
            {isDiscounted && (
              <span className="ml-2 text-sm line-through text-muted-foreground">
                €{(estimatedCost + baseDiagnosticFee).toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Cost breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-primary/20 pt-3">
            {partsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ricambi:</span>
                <span className="font-medium">€{partsTotal.toFixed(2)}</span>
              </div>
            )}
            {servicesTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Servizi:</span>
                <div className="flex items-center gap-2">
                  {originalServicesTotal && originalServicesTotal > servicesTotal && (
                    <span className="text-xs line-through text-muted-foreground">€{originalServicesTotal.toFixed(2)}</span>
                  )}
                  <span className={`font-medium ${originalServicesTotal && originalServicesTotal > servicesTotal ? "text-green-600" : ""}`}>
                    €{servicesTotal.toFixed(2)}
                  </span>
                  {originalServicesTotal && originalServicesTotal > servicesTotal && (
                    <span className="text-[9px] bg-green-500/20 text-green-600 px-1 rounded">-10%</span>
                  )}
                </div>
              </div>
            )}
            {laborTotal > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Manodopera:</span>
                <div className="flex items-center gap-2">
                  {originalLaborTotal && originalLaborTotal > laborTotal && (
                    <span className="text-xs line-through text-muted-foreground">€{originalLaborTotal.toFixed(2)}</span>
                  )}
                  <span className={`font-medium ${originalLaborTotal && originalLaborTotal > laborTotal ? "text-green-600" : ""}`}>
                    €{laborTotal.toFixed(2)}
                  </span>
                  {originalLaborTotal && originalLaborTotal > laborTotal && (
                    <span className="text-[9px] bg-green-500/20 text-green-600 px-1 rounded">-10%</span>
                  )}
                </div>
              </div>
            )}
            {shippingCost > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>🚚 Spedizione:</span>
                <span className="font-medium">€{shippingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diagnosi:</span>
              <span className={`font-medium ${isDiscounted ? "line-through text-muted-foreground" : ""}`}>
                €{isDiscounted ? baseDiagnosticFee.toFixed(2) : diagnosticFee.toFixed(2)}
              </span>
              {isDiscounted && (
                <span className="font-medium text-green-600">GRATIS</span>
              )}
            </div>
          </div>
          
          {/* Discount Toggle for high estimates */}
          {suggestDiscount && onDiagnosticFeeChange && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs font-medium text-green-700">Sconta diagnosi</p>
                    <p className="text-[10px] text-green-600/80">Preventivo alto (€{estimatedCost.toFixed(0)}+)</p>
                  </div>
                </div>
                <Switch
                  checked={isDiscounted}
                  onCheckedChange={toggleDiagnosticDiscount}
                />
              </div>
            </div>
          )}
          
          <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
            Il preventivo può variare in base ai danni effettivi riscontrati
          </p>
        </Card>
      </motion.div>

      {/* Loyalty Card Proposal Banner - show only if customer doesn't have active card */}
      {showLoyaltyProposal && customerId && centroId && totalPotentialSavings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 border-dashed">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">Risparmia con la Tessera Fedeltà!</span>
                  <Badge className="bg-green-500 text-white text-xs">
                    -€{totalPotentialSavings.toFixed(2)} su questo ritiro
                  </Badge>
                </div>
                
                {/* Show total comparison */}
                <div className="p-3 rounded-lg bg-background/80 border border-green-500/30 mb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Ora</p>
                      <p className="text-lg font-bold text-muted-foreground line-through">€{currentTotalForLoyalty.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-green-500" />
                    <div className="text-center">
                      <p className="text-[10px] text-green-600 uppercase font-medium">Con Tessera</p>
                      <p className="text-xl font-bold text-green-600">€{loyaltyDiscountedTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/30 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      Oggi paghi: <span className="font-semibold text-foreground">€{(loyaltyDiscountedTotal + 30).toFixed(2)}</span>
                      <span className="text-muted-foreground ml-1">(ritiro €{loyaltyDiscountedTotal.toFixed(2)} + tessera €30)</span>
                    </p>
                    {totalPotentialSavings > 30 && (
                      <p className="text-[10px] text-green-600 font-medium mt-1">
                        Già da questo ritiro risparmi €{(totalPotentialSavings - 30).toFixed(2)} netti!
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  {potentialDiagnosticSavings > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Diagnosi: <span className="line-through text-muted-foreground">€15</span> → <span className="text-green-600 font-medium">€10</span></span>
                    </div>
                  )}
                  
                  {potentialLaborSavings > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Manodopera: <span className="text-green-600 font-medium">-10%</span></span>
                    </div>
                  )}
                  
                  {potentialServicesSavings > 0 && (
                    <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Servizi: <span className="text-green-600 font-medium">-10%</span></span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1.5 p-2 rounded bg-background/50">
                    <Check className="h-3 w-3 text-green-500" />
                    <span>3 dispositivi coperti</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    onClick={() => setShowLoyaltyDialog(true)}
                    className="gap-1 bg-amber-500 hover:bg-amber-600"
                  >
                    <CreditCard className="h-3 w-3" />
                    Attiva Tessera €30/anno
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  
                  {onApplyLoyaltyIncentive && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={onApplyLoyaltyIncentive}
                      className="gap-1 border-green-500 text-green-600 hover:bg-green-500/10"
                    >
                      <Gift className="h-3 w-3" />
                      Applica Sconto Ora
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-4 border-2 border-primary/30">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Modalità di Pagamento</h3>
          </div>
          
          <RadioGroup 
            value={paymentMode} 
            onValueChange={(v) => handlePaymentModeSelect(v as "full" | "partial")}
            className="space-y-3"
          >
            <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${paymentMode === "full" ? "border-primary bg-primary/5" : "border-muted"}`}>
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pagamento Completo</p>
                    <p className="text-xs text-muted-foreground">Il cliente paga subito l'intero importo</p>
                  </div>
                  <span className="text-lg font-bold text-primary">€{totalWithDiagnostic.toFixed(2)}</span>
                </div>
              </Label>
            </div>
            
            <div className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${paymentMode === "partial" ? "border-amber-500 bg-amber-500/5" : "border-muted"}`}>
              <RadioGroupItem value="partial" id="partial" className="mt-1" />
              <Label htmlFor="partial" className="flex-1 cursor-pointer">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">Acconto</p>
                      <p className="text-xs text-muted-foreground">Il cliente lascia un acconto (min. €{diagnosticFee})</p>
                    </div>
                    <Wallet className="h-5 w-5 text-amber-500" />
                  </div>
                  
                  {paymentMode === "partial" && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">€</span>
                        <Input
                          type="number"
                          min={diagnosticFee}
                          max={totalWithDiagnostic}
                          step="0.01"
                          value={acconto || diagnosticFee}
                          onChange={(e) => handleAccontoInputChange(e.target.value)}
                          className="w-24 h-8 text-center font-bold"
                        />
                        <span className="text-xs text-muted-foreground">
                          su €{totalWithDiagnostic.toFixed(2)}
                        </span>
                      </div>
                      {remainingBalance > 0 && (
                        <p className="text-xs text-amber-600 font-medium">
                          Saldo residuo: €{remainingBalance.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Label>
            </div>
          </RadioGroup>
          
          {/* Amount Summary */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Da incassare ora:</span>
              <span className="text-xl font-bold text-primary">€{amountDueNow.toFixed(2)}</span>
            </div>
            {remainingBalance > 0 && (
              <div className="flex items-center justify-between mt-1 text-amber-600">
                <span className="text-xs">Saldo al ritiro:</span>
                <span className="text-sm font-medium">€{remainingBalance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Diagnostic Fee Card - only show if fee is separate/discountable */}
      {!isFeeDisabledBySettings && onDiagnosticFeeChange && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={`p-3 md:p-4 border ${isDiscounted ? "border-green-500/30 bg-green-500/5" : "border-muted"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${isDiscounted ? "bg-green-500" : "bg-muted"} flex items-center justify-center flex-shrink-0`}>
                <Euro className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground">
                  Fee Diagnosi
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isDiscounted ? "Fee omaggio applicato" : "Incluso nel totale"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <Switch
                    checked={!isDiscounted}
                    onCheckedChange={(checked) => onDiagnosticFeeChange(checked ? baseDiagnosticFee : 0)}
                  />
                  <span className="text-[9px] text-muted-foreground">
                    {isDiscounted ? "GRATIS" : `€${baseDiagnosticFee}`}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-3 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <h4 className="text-xs font-semibold text-foreground">Informativa Responsabilità</h4>
          </div>
          
          <ScrollArea className="h-[160px] md:h-[180px]">
            <div className="space-y-3 text-xs text-muted-foreground pr-2">
              {/* Esonero Responsabilità */}
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Esonero di Responsabilità (Art. 1229 c.c.)
                </p>
                <p>
                  Il cliente esonera il laboratorio da ogni responsabilità per perdita, corruzione 
                  o danneggiamento dei dati presenti sul dispositivo, malfunzionamenti derivanti 
                  da danni preesistenti non dichiarati, danni a componenti non oggetto di intervento 
                  e incompatibilità software post-riparazione. Si consiglia di effettuare un backup 
                  completo prima della consegna.
                </p>
              </div>

              {/* Variazione Preventivo */}
              <div className="pt-2 border-t border-amber-200">
                <p className="font-semibold text-foreground flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Variazione del Preventivo
                </p>
                <p>
                  Il preventivo iniziale è indicativo e potrà subire variazioni in base ai danni 
                  effettivamente riscontrati durante la diagnosi e l'intervento. Eventuali costi 
                  aggiuntivi saranno comunicati al cliente per approvazione prima di procedere.
                </p>
              </div>

              {/* Clausola Alienazione */}
              <div className="pt-2 border-t border-rose-200">
                <p className="text-rose-600 font-semibold flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Clausola di Alienazione (Art. 2756 c.c.)
                </p>
                <p className="text-rose-600/80">
                  In conformità all'Art. 2756 del Codice Civile italiano (Diritto di Ritenzione), 
                  il dispositivo non ritirato entro <span className="font-semibold">30 giorni</span> dalla 
                  comunicazione di completamento della riparazione sarà considerato abbandonato e 
                  diventerà di proprietà del laboratorio (Art. 923 c.c. - Cose abbandonate).
                </p>
                <p className="text-rose-600/80 mt-1 text-[10px]">
                  Il laboratorio si riserva il diritto di alienare, vendere o smaltire il dispositivo 
                  abbandonato per recuperare i costi delle prestazioni eseguite.
                </p>
              </div>

              {/* Informativa Privacy GDPR */}
              <div className="pt-2 border-t border-blue-200">
                <p className="text-blue-700 font-semibold flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5" />
                  Informativa Privacy (Art. 13 Reg. UE 2016/679)
                </p>
                <p className="text-blue-600/80 text-[10px] mb-2">
                  I dati personali raccolti (nome, cognome, telefono, email, indirizzo, dati del dispositivo) 
                  saranno trattati dal Titolare per le seguenti finalità:
                </p>
                <ul className="text-[10px] text-blue-600/80 list-disc list-inside space-y-0.5 mb-2">
                  <li>Gestione della pratica di riparazione e comunicazioni sullo stato del dispositivo</li>
                  <li>Adempimenti fiscali, contabili e obblighi di legge (conservazione 10 anni)</li>
                  <li>Contatto per feedback sulla qualità del servizio (legittimo interesse)</li>
                </ul>
                <p className="text-[10px] text-blue-600/80">
                  <strong>Base giuridica:</strong> Esecuzione del contratto (Art. 6.1.b GDPR). 
                  I dati potranno essere comunicati a fornitori di ricambi, corrieri e piattaforma gestionale.
                </p>
                <p className="text-[10px] text-blue-600/80 mt-1">
                  <strong>Diritti dell'interessato:</strong> Accesso, rettifica, cancellazione, portabilità, 
                  opposizione e limitazione (Artt. 15-22 GDPR). Per esercitarli contattare il Titolare.
                </p>
              </div>

              {/* Firma */}
              <p className="pt-2 border-t text-foreground font-medium">
                Firmando digitalmente, il cliente autorizza gli interventi, conferma il pagamento 
                anticipato di €{amountDueNow.toFixed(2)}, le clausole di esonero responsabilità e 
                alienazione sopra indicate. La firma digitale costituisce prova dell'accettazione 
                dei termini contrattuali ai sensi del Regolamento eIDAS e del CAD.
              </p>
            </div>
          </ScrollArea>
        </Card>
      </motion.div>

      {/* Marketing Consents Section */}
      {onMarketingConsentsChange && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <Card className="p-4 border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-semibold text-foreground">Consensi Marketing (opzionali)</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-500/10">
                <Checkbox 
                  id="marketing-consent"
                  checked={marketingConsents?.marketing_consent ?? false}
                  onCheckedChange={(checked) => onMarketingConsentsChange({
                    ...(marketingConsents || { marketing_consent: false, email_consent: false, sms_consent: false }),
                    marketing_consent: checked === true
                  })}
                />
                <Label htmlFor="marketing-consent" className="text-xs cursor-pointer flex-1">
                  Acconsento a ricevere comunicazioni marketing e promozioni
                </Label>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-500/10">
                <Checkbox 
                  id="email-consent"
                  checked={marketingConsents?.email_consent ?? false}
                  onCheckedChange={(checked) => onMarketingConsentsChange({
                    ...(marketingConsents || { marketing_consent: false, email_consent: false, sms_consent: false }),
                    email_consent: checked === true
                  })}
                />
                <Label htmlFor="email-consent" className="text-xs cursor-pointer flex-1">
                  Acconsento a ricevere newsletter via email
                </Label>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-500/10">
                <Checkbox 
                  id="sms-consent"
                  checked={marketingConsents?.sms_consent ?? false}
                  onCheckedChange={(checked) => onMarketingConsentsChange({
                    ...(marketingConsents || { marketing_consent: false, email_consent: false, sms_consent: false }),
                    sms_consent: checked === true
                  })}
                />
                <Label htmlFor="sms-consent" className="text-xs cursor-pointer flex-1">
                  Acconsento a ricevere notifiche SMS
                </Label>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Potrai modificare queste preferenze in qualsiasi momento dalla tua area personale o tramite il link di disiscrizione nelle email.
            </p>
          </Card>
        </motion.div>
      )}

      {/* Privacy Consent Checkbox */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
          privacyConsent 
            ? "border-green-500/50 bg-green-500/5" 
            : "border-primary/30 bg-primary/5"
        }`}>
          <Checkbox 
            id="privacy-consent"
            checked={privacyConsent}
            onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="privacy-consent" className="text-xs leading-relaxed cursor-pointer">
            Dichiaro di aver letto e compreso l'<strong>informativa sulla privacy</strong> ai sensi dell'Art. 13 
            del Reg. UE 2016/679 (GDPR) e acconsento al trattamento dei miei dati personali per le finalità 
            sopra indicate. <span className="text-destructive">*</span>
          </Label>
        </div>
        {!privacyConsent && (
          <p className="text-[10px] text-destructive mt-1 ml-1">
            Il consenso privacy è obbligatorio per procedere
          </p>
        )}
      </motion.div>

      {/* Signature Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <FileSignature className="h-3.5 w-3.5 text-primary" />
            Firma del Cliente
          </label>
          {!currentSignature && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground h-7 text-xs px-2"
            >
              <X className="h-3 w-3 mr-1" />
              Cancella
            </Button>
          )}
        </div>
        
        {/* Show received signature OR signature canvas */}
        {currentSignature ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-3"
          >
            {/* Display the received signature */}
            <Card className="p-2 bg-white border-2 border-green-500/50">
              <div className="relative">
                <img 
                  src={currentSignature} 
                  alt="Firma del cliente" 
                  className="w-full h-32 md:h-36 object-contain rounded"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Firmato
                </div>
              </div>
            </Card>
            
            <Alert className="border-green-500/30 bg-green-500/10 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-400 font-medium">
                Firma ricevuta e validata. Puoi procedere con il completamento.
              </AlertDescription>
            </Alert>

            {/* Button to clear and re-sign */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSignatureComplete("");
                sigCanvas.current?.clear();
              }}
              className="w-full h-9 text-xs border-dashed"
            >
              <X className="mr-2 h-3 w-3" />
              Richiedi Nuova Firma
            </Button>
          </motion.div>
        ) : (
          <>
            <Card className="p-0.5 bg-white border-2 border-dashed border-primary/40">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: "w-full h-32 md:h-36 rounded cursor-crosshair",
                  style: { touchAction: "none" }
                }}
                backgroundColor="white"
                penColor="#000000"
              />
            </Card>
            
            <p className="text-[10px] text-center text-muted-foreground">
              {isFeeDisabledBySettings 
                ? "Firma per accettare i termini del servizio"
                : "Firma per accettare i termini e il pagamento di €15"}
            </p>

            {/* Remote Signature Button */}
            <Button
              type="button"
              variant="outline"
              onClick={generateRemoteSignUrl}
              className="w-full h-10 text-sm font-semibold border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
              disabled={isGeneratingLink || !privacyConsent}
            >
              {isGeneratingLink ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Tablet className="mr-2 h-4 w-4" />
              )}
              Invia a Dispositivo Esterno
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90"
              disabled={!privacyConsent}
            >
              <FileSignature className="mr-2 h-4 w-4" />
              Salva Firma
            </Button>
          </>
        )}
      </motion.div>
      <Dialog open={showRemoteSignDialog} onOpenChange={setShowRemoteSignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tablet className="h-5 w-5 text-primary" />
              Firma su Dispositivo Esterno
            </DialogTitle>
            <DialogDescription>
              Invia il link al tablet, smartphone o tavoletta Wacom del cliente per raccogliere la firma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Device Icons */}
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Tablet className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Tablet</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Smartphone</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileSignature className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Wacom</span>
              </div>
            </div>

            {/* QR Code and Link Display */}
            {remoteSignUrl && (
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl border-2 border-primary/20 shadow-lg">
                    <QRCodeSVG 
                      value={remoteSignUrl} 
                      size={180}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-center text-muted-foreground">
                  Scansiona il QR code con il dispositivo del cliente
                </p>

                {/* Link Display */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Oppure usa il link:</p>
                  <p className="text-xs font-mono break-all text-foreground">
                    {remoteSignUrl}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copia
                  </Button>
                  <Button
                    onClick={openInNewTab}
                    variant="default"
                    className="flex-1"
                    size="sm"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Apri
                  </Button>
                </div>

                {/* Waiting indicator */}
                {isWaitingForRemoteSign && (
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <Wifi className="h-4 w-4 text-green-600 animate-pulse" />
                    <AlertDescription className="text-xs text-green-700">
                      In attesa della firma... La firma verrà sincronizzata automaticamente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loyalty Card Activation Dialog */}
      <Dialog open={showLoyaltyDialog} onOpenChange={setShowLoyaltyDialog}>
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
                  Sconto 10% su manodopera e servizi
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
              
              {totalPotentialSavings > 0 && (
                <div className="mt-3 p-2 rounded bg-green-500/20 text-center">
                  <span className="text-sm font-medium text-green-700">
                    Risparmio su questo ritiro: €{totalPotentialSavings.toFixed(2)}
                  </span>
                </div>
              )}
            </Card>
            
            <div className="space-y-2">
              <Button 
                className="w-full gap-2" 
                onClick={handleLoyaltyStripeCheckout}
                disabled={loyaltyProcessing}
              >
                {loyaltyProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                {loyaltyProcessing ? "Generazione QR..." : "💳 Genera QR Pagamento (€30)"}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleLoyaltyBonifico}
                disabled={loyaltyProcessing}
              >
                {loyaltyProcessing ? "Attivazione..." : "🏦 Pagamento Contanti/Bonifico"}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Commissione piattaforma: €1.50 (5%)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loyalty QR Code Payment Dialog */}
      <Dialog open={showLoyaltyQrDialog} onOpenChange={setShowLoyaltyQrDialog}>
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
            {loyaltyCheckoutUrl && (
              <div className="p-4 bg-white rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={loyaltyCheckoutUrl} 
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            )}
            
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">€30,00</p>
              <p className="text-sm text-muted-foreground">Tessera Fedeltà Annuale</p>
            </div>

            {isPollingLoyalty && (
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
                onClick={() => loyaltyCheckoutUrl && window.open(loyaltyCheckoutUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Apri Link
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1"
                onClick={() => setShowLoyaltyQrDialog(false)}
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
