import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSignature, X, CheckCircle2, Tablet, Shield, Loader2, Scale } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function RemoteSignature() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  const amount = searchParams.get("amount") || "0.00";
  const total = searchParams.get("total") || "0.00";

  // Check session validity on mount
  useEffect(() => {
    if (!sessionId) return;
    
    const sessionData = localStorage.getItem(`remote-sign-${sessionId}`);
    if (!sessionData) {
      // Check if session exists in channel (for cross-device)
      const channel = supabase.channel(`signature-${sessionId}`);
      channel
        .on('broadcast', { event: 'session_info' }, (payload) => {
          console.log('Received session info:', payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'request_session',
              payload: { sessionId }
            });
          }
        });
        
      // Session might exist on another device, allow signing
      return () => {
        supabase.removeChannel(channel);
      };
    }
    
    const session = JSON.parse(sessionData);
    
    // Check if session is older than 30 minutes
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > 30 * 60 * 1000) {
      setSessionExpired(true);
      return;
    }
    
    // Check if already signed
    if (session.status === 'signed') {
      setAlreadySigned(true);
    }
  }, [sessionId]);

  // Set up real-time channel for signature sync
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`signature-${sessionId}`);
    
    channel
      .on('broadcast', { event: 'signature_submitted' }, (payload) => {
        console.log('Another device submitted signature:', payload);
        setAlreadySigned(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsSigned(false);
  };

  const handleSubmit = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast.error("Per favore, firma prima di inviare");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const signatureData = sigCanvas.current.toDataURL();
      
      // Update localStorage session
      const sessionData = localStorage.getItem(`remote-sign-${sessionId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.status = 'signed';
        session.signatureData = signatureData;
        session.signedAt = Date.now();
        localStorage.setItem(`remote-sign-${sessionId}`, JSON.stringify(session));
      }
      
      // Broadcast signature to other devices via Supabase Realtime
      const channel = supabase.channel(`signature-${sessionId}`);
      await channel.subscribe();
      
      await channel.send({
        type: 'broadcast',
        event: 'signature_completed',
        payload: {
          sessionId,
          signatureData,
          signedAt: new Date().toISOString()
        }
      });
      
      setIsSigned(true);
      toast.success("Firma inviata con successo!");
      
      // Clean up channel after a short delay
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 1000);
      
    } catch (error: any) {
      console.error("Error submitting signature:", error);
      toast.error("Errore durante l'invio della firma");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sessione Scaduta</h1>
          <p className="text-muted-foreground">
            Questa richiesta di firma è scaduta. Richiedi un nuovo link al tecnico.
          </p>
        </Card>
      </div>
    );
  }

  if (alreadySigned || isSigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center space-y-4 border-green-500/30 bg-green-500/5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto rounded-full bg-green-500 flex items-center justify-center"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-green-700">Firma Completata!</h1>
            <p className="text-muted-foreground">
              La tua firma è stata registrata correttamente. Puoi chiudere questa pagina.
            </p>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Importo accettato: <span className="font-bold text-foreground">€{amount}</span>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Tablet className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Firma Digitale</h1>
          <p className="text-muted-foreground">
            Firma per accettare i termini del servizio
          </p>
        </motion.div>

        {/* Amount Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Importo da Pagare</p>
              <p className="text-4xl font-bold text-primary">€{amount}</p>
              {amount !== total && (
                <p className="text-xs text-muted-foreground">
                  su un totale di €{total}
                </p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <h4 className="text-sm font-semibold text-foreground">Informativa</h4>
            </div>
            
            <ScrollArea className="h-[120px]">
              <div className="space-y-2 text-xs text-muted-foreground pr-2">
                <p>
                  <strong>Esonero Responsabilità:</strong> Il laboratorio è esonerato da responsabilità 
                  per perdita dati, danni preesistenti non dichiarati e incompatibilità software.
                </p>
                <p>
                  <strong>Variazione Preventivo:</strong> Il preventivo può variare in base ai danni 
                  effettivamente riscontrati durante la diagnosi.
                </p>
                <p className="text-rose-600">
                  <strong>Clausola Alienazione:</strong> Dispositivi non ritirati entro 30 giorni 
                  diventeranno proprietà del laboratorio (Art. 2756 c.c.).
                </p>
              </div>
            </ScrollArea>
          </Card>
        </motion.div>

        {/* Privacy Consent GDPR */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4 border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <h4 className="text-sm font-semibold text-foreground">Informativa Privacy (GDPR)</h4>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              I tuoi dati personali saranno trattati per la gestione della riparazione ai sensi 
              dell'Art. 13 Reg. UE 2016/679. Hai diritto di accesso, rettifica e cancellazione 
              contattando il Titolare del trattamento.
            </p>
            
            <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              privacyConsent 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-primary/30 bg-primary/5"
            }`}>
              <Checkbox 
                id="privacy-consent-remote"
                checked={privacyConsent}
                onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="privacy-consent-remote" className="text-xs leading-relaxed cursor-pointer">
                Accetto l'informativa privacy e acconsento al trattamento dei miei dati personali 
                per le finalità indicate. <span className="text-destructive">*</span>
              </Label>
            </div>
          </Card>
        </motion.div>

        {/* Signature Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileSignature className="h-4 w-4 text-primary" />
              La Tua Firma
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

          <Card className="p-1 bg-white border-2 border-dashed border-primary/40 hover:border-primary/60 transition-colors">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-48 md:h-56 rounded cursor-crosshair",
                style: { touchAction: "none" }
              }}
              backgroundColor="white"
              penColor="#000000"
            />
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Usa il dito o lo stilo per firmare nell'area sopra
          </p>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !privacyConsent}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Conferma e Invia Firma
              </>
            )}
          </Button>
          {!privacyConsent && (
            <p className="text-xs text-center text-destructive mt-2">
              Devi accettare l'informativa privacy per procedere
            </p>
          )}
        </motion.div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          La firma digitale è valida ai sensi del Regolamento eIDAS e del CAD
        </p>
      </div>
    </div>
  );
}