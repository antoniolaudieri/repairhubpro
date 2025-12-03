import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileSignature, X, Euro, Shield, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-4">
      {/* Diagnostic Fee Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-3 md:p-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <Euro className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-bold text-foreground">
                Gestione Diagnosi
              </h3>
              <p className="text-xs text-muted-foreground">
                Costo fisso per analisi del dispositivo
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl md:text-2xl font-bold text-primary">€15</span>
              <p className="text-[10px] text-amber-600 font-medium">Anticipo</p>
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
        <Card className="p-3 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <h4 className="text-xs font-semibold text-foreground">Informativa Responsabilità</h4>
          </div>
          
          <ScrollArea className="h-[120px] md:h-[140px]">
            <div className="space-y-2 text-xs text-muted-foreground pr-2">
              <p>Il laboratorio non si assume responsabilità per:</p>
              <ul className="space-y-1 ml-2">
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>Perdita o corruzione dati</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>Malfunzionamenti da danni preesistenti</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>Danni a componenti non sostituiti</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>Incompatibilità software post-intervento</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-rose-200 mt-2">
                <p className="text-rose-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Clausola di Alienazione (Art. 2756 c.c.)
                </p>
                <p className="text-rose-600/80 mt-1">
                  In conformità all'Art. 2756 del Codice Civile italiano (Diritto di Ritenzione), 
                  il dispositivo non ritirato entro 30 giorni dalla comunicazione di completamento 
                  della riparazione sarà considerato abbandonato e diventerà di proprietà del laboratorio.
                </p>
                <p className="text-rose-600/80 mt-1 text-[10px]">
                  Il laboratorio si riserva il diritto di alienare, vendere o smaltire il dispositivo 
                  abbandonato per recuperare i costi delle prestazioni eseguite.
                </p>
              </div>
              <p className="pt-2 text-foreground font-medium">
                Firmando digitalmente, il cliente autorizza gli interventi, accetta il pagamento di €15 
                per la diagnosi e la clausola di alienazione. La firma digitale costituisce prova 
                dell'accettazione dei termini contrattuali ai sensi della normativa vigente.
              </p>
            </div>
          </ScrollArea>
        </Card>
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
        </div>
        
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
          Firma per accettare i termini e il pagamento di €15
        </p>

        {currentSignature && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert className="border-green-500/30 bg-green-500/5 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                Firma salvata. Puoi modificarla firmando di nuovo.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Button
          type="button"
          onClick={handleSave}
          className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90"
        >
          <FileSignature className="mr-2 h-4 w-4" />
          Salva Firma
        </Button>
      </motion.div>
    </div>
  );
}
