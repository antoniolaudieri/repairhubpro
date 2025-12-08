import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, Mail, FileText } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

interface CentroData {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_number?: string | null;
}

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
    diagnostic_fee_paid?: boolean;
    acconto?: number | null;
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
    centro?: CentroData | null;
  };
}

export function AcceptanceFormPDF({ open, onOpenChange, repairData }: AcceptanceFormPDFProps) {
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

  const handleSendEmail = () => {
    if (!repairData.customer.email) {
      toast.error("Email cliente non disponibile");
      return;
    }

    const baseUrl = window.location.origin;
    const loginUrl = `${baseUrl}/auth?email=${encodeURIComponent(repairData.customer.email)}`;
    const repairTrackingUrl = `${baseUrl}/customer-repair/${repairData.id}`;
    
    const subject = encodeURIComponent(`🔧 TechRepair - Conferma Accettazione Riparazione #${repairData.id.slice(0, 8).toUpperCase()}`);
    
    const body = encodeURIComponent(`
══════════════════════════════════════════
          🔧 TECHREPAIR
    Centro Assistenza Tecnica
══════════════════════════════════════════

Gentile ${repairData.customer.name},

La ringraziamo per aver scelto TechRepair per la riparazione del suo dispositivo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 DETTAGLI DISPOSITIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Tipo: ${repairData.device.device_type}
• Marca: ${repairData.device.brand}
• Modello: ${repairData.device.model}
• N° Pratica: #${repairData.id.slice(0, 8).toUpperCase()}
• Data Accettazione: ${format(new Date(repairData.created_at), "dd MMMM yyyy", { locale: it })}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 RIEPILOGO COSTI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Gestione Diagnosi: € ${(repairData.diagnostic_fee ?? 15).toFixed(2)}
${repairData.estimated_cost ? `• Preventivo Stimato: € ${repairData.estimated_cost.toFixed(2)} (soggetto a variazione)` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 ACCEDI ALLA TUA AREA PERSONALE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Può seguire lo stato della sua riparazione in tempo reale 
accedendo alla sua area personale:

👉 ACCEDI QUI: ${loginUrl}

Le sue credenziali di accesso:
• Email: ${repairData.customer.email}
• Password: 12345678

Una volta effettuato l'accesso, potrà:
✅ Visualizzare lo stato della riparazione
✅ Vedere i dettagli dei costi e ricambi
✅ Firmare digitalmente l'accettazione del preventivo finale
✅ Ricevere notifiche in tempo reale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 LINK DIRETTO RIPARAZIONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${repairTrackingUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ IMPORTANTE - CLAUSOLA DI ALIENAZIONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le ricordiamo che, come da accordi firmati, il dispositivo 
dovrà essere ritirato entro 30 giorni dalla comunicazione 
di completamento della riparazione (Art. 2756 c.c.).

══════════════════════════════════════════

Cordiali saluti,
Il Team TechRepair

📞 Contatti: XXX-XXXXXXX
📧 Email: info@techrepair.it
🌐 Web: www.techrepair.it

══════════════════════════════════════════
    `);

    window.location.href = `mailto:${repairData.customer.email}?subject=${subject}&body=${body}`;
    toast.success("Client email aperto con il messaggio preparato");
  };

  const diagnosticFee = repairData.diagnostic_fee ?? 15;
  const acconto = repairData.acconto ?? 0;
  const estimatedCost = repairData.estimated_cost ?? 0;
  
  // Check if diagnostic fee is waived (at Centro's discretion)
  const isDiagnosticFeeWaived = diagnosticFee === 0;
  const isDiagnosticFeePaid = repairData.diagnostic_fee_paid ?? false;
  
  // Calculate remaining balance
  const totalPaid = acconto + (isDiagnosticFeePaid ? diagnosticFee : 0);
  const remainingBalance = estimatedCost > 0 ? estimatedCost - totalPaid : 0;

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
          <Button onClick={handleSendEmail} variant="outline" className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600">
            <Mail className="h-4 w-4" />
            Invia Email al Cliente
          </Button>
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
            <h2>COSTI E PAGAMENTI</h2>
            
            {/* Diagnostic Fee Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Gestione Diagnosi:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isDiagnosticFeeWaived ? (
                  <>
                    <span style={{ textDecoration: "line-through", color: "#999" }}>€ 15.00</span>
                    <strong style={{ color: "#16a34a" }}>OMAGGIO</strong>
                  </>
                ) : (
                  <>
                    <strong>€ {diagnosticFee.toFixed(2)}</strong>
                    {isDiagnosticFeePaid ? (
                      <span style={{ backgroundColor: "#16a34a", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>SALDATO</span>
                    ) : (
                      <span style={{ backgroundColor: "#eab308", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>DA SALDARE</span>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Estimated Cost Row */}
            {estimatedCost > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span>Preventivo Stimato (soggetto a variazione):</span>
                <strong>€ {estimatedCost.toFixed(2)}</strong>
              </div>
            )}
            
            {/* Acconto (Deposit) Row */}
            {acconto > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", backgroundColor: "#f0fdf4", padding: "8px", borderRadius: "4px" }}>
                <span>Acconto Versato:</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <strong style={{ color: "#16a34a" }}>€ {acconto.toFixed(2)}</strong>
                  <span style={{ backgroundColor: "#16a34a", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px" }}>INCASSATO</span>
                </div>
              </div>
            )}
            
            {/* Remaining Balance Row */}
            {estimatedCost > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #ccc" }}>
                <span><strong>Saldo da incassare al ritiro:</strong></span>
                <strong style={{ fontSize: "14px", color: remainingBalance > 0 ? "#dc2626" : "#16a34a" }}>
                  € {remainingBalance.toFixed(2)}
                </strong>
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
                <p>
                  {isDiagnosticFeeWaived 
                    ? "Gestione diagnosi OMAGGIO. " 
                    : `Pagamento anticipato di € ${diagnosticFee.toFixed(2)} per gestione diagnosi${isDiagnosticFeePaid ? " (SALDATO)" : ""}. `}
                  {acconto > 0 && `Acconto versato: € ${acconto.toFixed(2)}. `}
                  {remainingBalance > 0
                    ? `Saldo residuo di € ${remainingBalance.toFixed(2)} da corrispondere al ritiro del dispositivo.`
                    : estimatedCost > 0 ? "Nessun saldo residuo da corrispondere." : "Saldo finale al ritiro del dispositivo."}
                </p>
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
                <div className="signature-img" style={{ height: "auto", minHeight: "80px", padding: "8px" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: "bold", fontSize: "14px", margin: 0 }}>
                      {repairData.centro?.business_name || "TechRepair"}
                    </p>
                    <p style={{ fontSize: "10px", margin: "2px 0" }}>Centro Assistenza Tecnica</p>
                    {repairData.centro && (
                      <>
                        <p style={{ fontSize: "9px", margin: "2px 0", color: "#444" }}>
                          {repairData.centro.address}
                        </p>
                        <p style={{ fontSize: "9px", margin: "2px 0", color: "#444" }}>
                          Tel: {repairData.centro.phone} | {repairData.centro.email}
                        </p>
                        {repairData.centro.vat_number && (
                          <p style={{ fontSize: "9px", margin: "2px 0", color: "#444" }}>
                            P.IVA: {repairData.centro.vat_number}
                          </p>
                        )}
                      </>
                    )}
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
