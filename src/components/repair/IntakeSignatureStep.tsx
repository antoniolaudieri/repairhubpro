import { useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSignature, X, Euro, Shield, CheckCircle2, Gift, CreditCard, Wallet, Tablet, Smartphone, QrCode, Copy, ExternalLink, Loader2, Wifi, Scale } from "lucide-react";
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

interface IntakeSignatureStepProps {
  onSignatureComplete: (signatureData: string) => void;
  currentSignature: string | null;
  estimatedCost?: number;
  partsTotal?: number;
  servicesTotal?: number;
  laborTotal?: number;
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
}

export function IntakeSignatureStep({ 
  onSignatureComplete, 
  currentSignature,
  estimatedCost = 0,
  partsTotal = 0,
  servicesTotal = 0,
  laborTotal = 0,
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
  
  // Use external privacy consent if provided, otherwise use internal state
  const privacyConsent = externalPrivacyConsent !== undefined ? externalPrivacyConsent : internalPrivacyConsent;
  
  const setPrivacyConsent = (value: boolean) => {
    setInternalPrivacyConsent(value);
    onPrivacyConsentChange?.(value);
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servizi:</span>
                <span className="font-medium">€{servicesTotal.toFixed(2)}</span>
              </div>
            )}
            {laborTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manodopera:</span>
                <span className="font-medium">€{laborTotal.toFixed(2)}</span>
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

      {/* Payment Mode Selection */}
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
    </div>
  );
}
