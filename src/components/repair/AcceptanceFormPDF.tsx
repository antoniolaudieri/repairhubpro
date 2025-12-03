import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Mail, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AcceptanceFormPDFProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairData: {
    id: string;
    created_at: string;
    intake_signature?: string | null;
    intake_signature_date?: string | null;
    estimated_cost?: number | null;
    diagnostic_fee?: number;
    device: {
      brand: string;
      model: string;
      device_type: string;
      reported_issue: string;
      imei?: string | null;
      serial_number?: string | null;
    };
    customer: {
      name: string;
      email?: string | null;
      phone: string;
      address?: string | null;
    };
  };
  onSendEmail?: () => void;
}

export function AcceptanceFormPDF({ open, onOpenChange, repairData, onSendEmail }: AcceptanceFormPDFProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = contentRef.current;
    if (!printContent) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Modulo Accettazione - ${repairData.id.slice(0, 8)}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
              * { box-sizing: border-box; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 24px; }
              .header h1 { font-size: 20px; margin: 0; }
              .header p { font-size: 12px; margin-top: 4px; }
              .info-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 16px; }
              .section { border: 1px solid #666; padding: 12px; margin-bottom: 12px; }
              .section h2 { font-size: 14px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ccc; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
              .terms { font-size: 10px; }
              .terms > div { margin-bottom: 8px; }
              .terms p { margin: 4px 0; }
              .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
              .signature-box { text-align: center; }
              .signature-box p { font-size: 12px; font-weight: bold; margin-bottom: 8px; }
              .signature-img { border: 1px solid #ccc; height: 80px; display: flex; align-items: center; justify-content: center; }
              .signature-img img { max-height: 100%; max-width: 100%; object-fit: contain; }
              .footer { margin-top: 16px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ccc; padding-top: 12px; }
              .red { color: #991b1b; }
              .issue-box { margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const diagnosticFee = repairData.diagnostic_fee ?? 15;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modulo di Accettazione
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Stampa / Salva PDF
          </Button>
          {onSendEmail && (
            <Button onClick={onSendEmail} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Invia via Email
            </Button>
          )}
        </div>

        <div ref={contentRef} className="bg-white p-6 text-black border rounded-lg text-sm">
          <div className="header">
            <h1>MODULO DI ACCETTAZIONE RIPARAZIONE</h1>
            <p>TechRepair - Centro Assistenza Tecnica</p>
          </div>

          <div className="info-row">
            <span><strong>N° Pratica:</strong> {repairData.id.slice(0, 8).toUpperCase()}</span>
            <span><strong>Data:</strong> {format(new Date(repairData.created_at), "dd MMMM yyyy", { locale: it })}</span>
          </div>

          <div className="section">
            <h2>DATI CLIENTE</h2>
            <div className="grid">
              <div><strong>Nome:</strong> {repairData.customer.name}</div>
              <div><strong>Telefono:</strong> {repairData.customer.phone}</div>
              <div><strong>Email:</strong> {repairData.customer.email || "N/A"}</div>
              <div><strong>Indirizzo:</strong> {repairData.customer.address || "N/A"}</div>
            </div>
          </div>

          <div className="section">
            <h2>DATI DISPOSITIVO</h2>
            <div className="grid">
              <div><strong>Tipo:</strong> {repairData.device.device_type}</div>
              <div><strong>Marca:</strong> {repairData.device.brand}</div>
              <div><strong>Modello:</strong> {repairData.device.model}</div>
              {repairData.device.imei && <div><strong>IMEI:</strong> {repairData.device.imei}</div>}
              {repairData.device.serial_number && <div><strong>S/N:</strong> {repairData.device.serial_number}</div>}
            </div>
            <div style={{ marginTop: "8px" }}>
              <strong>Problema Riscontrato:</strong>
              <div className="issue-box">{repairData.device.reported_issue}</div>
            </div>
          </div>

          <div className="section">
            <h2>COSTI</h2>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Gestione Diagnosi (anticipo obbligatorio):</span>
              <strong>€ {diagnosticFee.toFixed(2)}</strong>
            </div>
            {repairData.estimated_cost && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                <span>Preventivo Stimato (soggetto a variazione):</span>
                <strong>€ {repairData.estimated_cost.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div className="section">
            <h2>TERMINI E CONDIZIONI</h2>
            <div className="terms">
              <div>
                <p><strong>1. ESONERO DI RESPONSABILITÀ (Art. 1229 c.c.)</strong></p>
                <p>Il cliente esonera il laboratorio da ogni responsabilità per perdita, corruzione o danneggiamento dei dati presenti sul dispositivo, malfunzionamenti derivanti da danni preesistenti non dichiarati, danni a componenti non oggetto di intervento e incompatibilità software post-riparazione.</p>
              </div>
              <div>
                <p><strong>2. VARIAZIONE DEL PREVENTIVO</strong></p>
                <p>Il preventivo iniziale è indicativo e potrà subire variazioni in base ai danni effettivamente riscontrati durante la diagnosi. Costi aggiuntivi saranno comunicati per approvazione prima di procedere.</p>
              </div>
              <div>
                <p className="red"><strong>3. CLAUSOLA DI ALIENAZIONE (Art. 2756 c.c. - Art. 923 c.c.)</strong></p>
                <p>Il dispositivo non ritirato entro 30 giorni dalla comunicazione di completamento sarà considerato abbandonato e diventerà proprietà del laboratorio. Il laboratorio potrà alienare, vendere o smaltire il dispositivo per recuperare i costi.</p>
              </div>
              <div>
                <p><strong>4. PAGAMENTO</strong></p>
                <p>Pagamento anticipato di € {diagnosticFee.toFixed(2)} per gestione diagnosi. Saldo finale al ritiro del dispositivo.</p>
              </div>
            </div>
          </div>

          <div className="section">
            <h2>FIRMA E ACCETTAZIONE</h2>
            <p style={{ fontSize: "10px", marginBottom: "12px" }}>
              Con la presente firma, il cliente dichiara di aver letto e accettato tutti i termini e le condizioni sopra riportate, incluse le clausole di esonero responsabilità e alienazione.
            </p>
            
            <div className="signature-area">
              <div className="signature-box">
                <p>Firma del Cliente</p>
                <div className="signature-img">
                  {repairData.intake_signature ? (
                    <img src={repairData.intake_signature} alt="Firma cliente" />
                  ) : (
                    <span style={{ color: "#999", fontSize: "11px" }}>Firma non disponibile</span>
                  )}
                </div>
                {repairData.intake_signature_date && (
                  <p style={{ fontSize: "10px", marginTop: "4px", fontWeight: "normal" }}>
                    Firmato il: {format(new Date(repairData.intake_signature_date), "dd/MM/yyyy HH:mm", { locale: it })}
                  </p>
                )}
              </div>
              
              <div className="signature-box">
                <p>Timbro Laboratorio</p>
                <div className="signature-img">
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>TechRepair</p>
                    <p style={{ fontSize: "10px", margin: 0 }}>Centro Assistenza Tecnica</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="footer">
            <p>Documento generato automaticamente - Valido ai sensi di legge con firma digitale</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
