import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileSignature, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      {/* Disclaimer */}
      <Alert className="border-amber-500/50 bg-amber-50/10">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <AlertDescription className="text-sm leading-relaxed">
          <strong className="font-semibold text-foreground block mb-2">Informativa sulla Responsabilità</strong>
          <ScrollArea className="h-[180px] pr-3">
            <div className="space-y-2 text-muted-foreground">
              <p>
                Il laboratorio <strong>TechRepair</strong> non si assume alcuna responsabilità per eventuali:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Perdita di dati</strong> presenti sul dispositivo</li>
                <li><strong>Cancellazione o corruzione</strong> di file, documenti, foto, video e applicazioni</li>
                <li><strong>Malfunzionamenti</strong> causati da danni preesistenti non dichiarati</li>
                <li><strong>Danni a componenti</strong> non sostituiti durante la riparazione</li>
                <li><strong>Incompatibilità software</strong> rilevate dopo l'intervento</li>
              </ul>
              <p className="pt-2">
                Si raccomanda vivamente di <strong>effettuare un backup completo</strong> dei propri dati prima di consegnare il dispositivo. 
                Il cliente dichiara di aver preso visione delle condizioni e di accettare integralmente i termini del servizio.
              </p>
              <p className="pt-2 font-medium">
                Firmando questo documento, il cliente autorizza il laboratorio ad eseguire gli interventi necessari 
                e solleva lo stesso da ogni responsabilità relativamente alle situazioni sopra elencate.
              </p>
            </div>
          </ScrollArea>
        </AlertDescription>
      </Alert>

      {/* Signature Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <FileSignature className="h-4 w-4 text-primary" />
            Firma del Cliente
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
        
        <Card className="p-4 bg-white border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: "w-full h-48 rounded-lg cursor-crosshair touch-action-none",
            }}
            backgroundColor="white"
            penColor="#000000"
          />
        </Card>
        
        <p className="text-xs text-muted-foreground text-center">
          Il cliente firma per accettare i termini e le condizioni sopra riportate
        </p>

        {currentSignature && (
          <Alert className="border-green-500/50 bg-green-50/10">
            <FileSignature className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-sm">
              Firma salvata. Puoi modificarla firmando nuovamente nell'area sopra.
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          <FileSignature className="mr-2 h-4 w-4" />
          Salva Firma
        </Button>
      </div>
    </div>
  );
}