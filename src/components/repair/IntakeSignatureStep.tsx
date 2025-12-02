import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileSignature, X, Euro, Shield, CheckCircle2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface IntakeSignatureStepProps {
  onSignatureComplete: (signatureData: string) => void;
  currentSignature: string | null;
}

export function IntakeSignatureStep({ onSignatureComplete, currentSignature }: IntakeSignatureStepProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL();
      onSignatureComplete(signatureData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Diagnostic Fee Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Euro className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Gestione Diagnosi
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Costo fisso per analisi e diagnosi del dispositivo
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    €15,00
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-semibold border border-amber-500/20">
                    Da pagare in anticipo
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Il costo di gestione diagnosi include l'analisi completa del dispositivo e la valutazione del guasto</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
          <div className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Informativa sulla Responsabilità</h4>
                <p className="text-xs text-muted-foreground">Leggi attentamente prima di firmare</p>
              </div>
            </div>
            
            <ScrollArea className="h-[160px] pr-3">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Il laboratorio <strong className="text-foreground">TechRepair</strong> non si assume alcuna responsabilità per eventuali:
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong className="text-foreground">Perdita di dati</strong> presenti sul dispositivo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong className="text-foreground">Cancellazione o corruzione</strong> di file, documenti, foto, video e applicazioni</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong className="text-foreground">Malfunzionamenti</strong> causati da danni preesistenti non dichiarati</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong className="text-foreground">Danni a componenti</strong> non sostituiti durante la riparazione</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    <span><strong className="text-foreground">Incompatibilità software</strong> rilevate dopo l'intervento</span>
                  </li>
                </ul>
                <p className="pt-2">
                  Si raccomanda vivamente di <strong className="text-foreground">effettuare un backup completo</strong> dei propri dati prima di consegnare il dispositivo.
                </p>
                <p className="pt-1 font-medium text-foreground">
                  Firmando questo documento, il cliente autorizza il laboratorio ad eseguire gli interventi necessari, 
                  accetta il pagamento anticipato di €15 per la gestione diagnosi e solleva lo stesso da ogni responsabilità.
                </p>
              </div>
            </ScrollArea>
          </div>
        </Card>
      </motion.div>

      {/* Signature Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Firma del Cliente
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Cancella
          </Button>
        </div>
        
        <Card className="p-1 bg-white border-2 border-dashed border-primary/40 hover:border-primary/60 transition-all duration-300 shadow-sm hover:shadow-md">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: "w-full h-44 rounded-lg cursor-crosshair",
              style: { touchAction: "none" }
            }}
            backgroundColor="white"
            penColor="#000000"
          />
        </Card>
        
        <p className="text-xs text-center text-muted-foreground">
          Firma per accettare i termini, le condizioni e il pagamento della gestione diagnosi di €15
        </p>

        {currentSignature && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert className="border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-400">
                Firma salvata correttamente. Puoi modificarla firmando nuovamente.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Button
          type="button"
          onClick={handleSave}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          <FileSignature className="mr-2 h-5 w-5" />
          Salva Firma e Conferma €15
        </Button>
      </motion.div>
    </div>
  );
}
