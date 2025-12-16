import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ForensicReport {
  report_number: string;
  report_date: string;
  purpose: string;
  recipient_name: string | null;
  recipient_role: string | null;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  device_serial: string | null;
  device_imei: string | null;
  device_condition: string | null;
  analysis_summary: string;
  malware_check: boolean;
  malware_findings: string | null;
  spyware_check: boolean;
  spyware_findings: string | null;
  compromised_accounts_check: boolean;
  compromised_accounts_findings: string | null;
  data_integrity_check: boolean;
  data_integrity_findings: string | null;
  other_findings: string | null;
  conclusions: string;
  recommendations: string | null;
  technician_name: string;
  technician_qualification: string | null;
  technician_signature: string | null;
  customer: {
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
  };
}

interface Centro {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string | null;
  logo_url: string | null;
}

const purposeLabels: Record<string, string> = {
  avvocato: 'Avvocato',
  polizia_postale: 'Polizia Postale',
  assicurazione: 'Assicurazione',
  altro: 'Altro'
};

export async function generateForensicReportPDF(report: ForensicReport, centro: Centro): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  // Helper function to add page break if needed
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 25) {
      pdf.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // Helper for section headers
  const addSectionHeader = (title: string, bgColor: [number, number, number] = [30, 41, 59]) => {
    addNewPageIfNeeded(25);
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 5, y + 6);
    y += 13;
  };

  // ==================== HEADER ====================
  const headerHeight = 58;
  
  // Dark header background
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Decorative accent line
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, headerHeight - 3, pageWidth, 3, 'F');

  const textStartX = centro.logo_url ? margin + 42 : margin;
  const headerTextY = 14;

  // Logo
  if (centro.logo_url) {
    try {
      pdf.addImage(centro.logo_url, 'PNG', margin, 10, 36, 36);
    } catch (e) {
      console.log('Could not load logo');
    }
  }

  // Title and company info
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERIZIA TECNICA FORENSE', textStartX, headerTextY);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(203, 213, 225);
  pdf.text(centro.business_name, textStartX, headerTextY + 7);
  pdf.text(`${centro.address} | Tel: ${centro.phone}`, textStartX, headerTextY + 13);
  pdf.text(`Email: ${centro.email}`, textStartX, headerTextY + 19);
  if (centro.vat_number) {
    pdf.text(`P.IVA: ${centro.vat_number}`, textStartX, headerTextY + 25);
  }

  // Report number badge
  const badgeX = pageWidth - margin - 46;
  const badgeY = 10;
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(badgeX, badgeY, 44, 34, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('N. PERIZIA', badgeX + 22, badgeY + 7, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.report_number, badgeX + 22, badgeY + 16, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(format(new Date(report.report_date), 'dd/MM/yyyy'), badgeX + 22, badgeY + 26, { align: 'center' });

  y = headerHeight + 10;

  // ==================== CLIENT & RECIPIENT ====================
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 38, 3, 3, 'F');
  
  // Left border accent
  pdf.setFillColor(59, 130, 246);
  pdf.rect(margin, y, 3, 38, 'F');

  const halfWidth = contentWidth / 2;

  // Committente
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COMMITTENTE', margin + 10, y + 8);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(report.customer.name, margin + 10, y + 15);
  
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Tel: ${report.customer.phone}`, margin + 10, y + 22);
  if (report.customer.email) {
    pdf.text(`Email: ${report.customer.email}`, margin + 10, y + 28);
  }
  if (report.customer.address) {
    pdf.text(report.customer.address, margin + 10, y + 34);
  }

  // Separator line
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin + halfWidth, y + 5, margin + halfWidth, y + 33);

  // Destinatario
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESTINATARIO PERIZIA', margin + halfWidth + 8, y + 8);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(purposeLabels[report.purpose] || report.purpose, margin + halfWidth + 8, y + 15);
  
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  if (report.recipient_name) {
    pdf.text(report.recipient_name, margin + halfWidth + 8, y + 22);
  }
  if (report.recipient_role) {
    pdf.text(report.recipient_role, margin + halfWidth + 8, y + 28);
  }

  y += 46;

  // ==================== DEVICE INFO ====================
  addSectionHeader('DISPOSITIVO OGGETTO DI ANALISI');

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  const deviceInfo = [
    ['Tipo:', report.device_type],
    ['Marca:', report.device_brand || '-'],
    ['Modello:', report.device_model || '-'],
    ['Seriale:', report.device_serial || '-'],
    ['IMEI:', report.device_imei || '-'],
    ['Condizione:', report.device_condition || '-']
  ];

  pdf.setFontSize(8);
  deviceInfo.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const colWidth = contentWidth / 3;
    
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, margin + 5 + col * colWidth, y + 6 + row * 8);
    
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(value), margin + 24 + col * colWidth, y + 6 + row * 8);
  });

  y += 26;

  // ==================== ANALYSIS SUMMARY ====================
  addSectionHeader('SOMMARIO DELLE OPERAZIONI DI ANALISI');

  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const summaryLines = pdf.splitTextToSize(report.analysis_summary, contentWidth - 10);
  pdf.text(summaryLines, margin + 5, y);
  y += summaryLines.length * 4.5 + 10;

  // ==================== FINDINGS ====================
  const findings = [
    { check: report.malware_check, title: 'VERIFICA MALWARE', result: report.malware_findings, color: [239, 68, 68] as [number, number, number] },
    { check: report.spyware_check, title: 'VERIFICA SPYWARE / SOFTWARE SPIA', result: report.spyware_findings, color: [249, 115, 22] as [number, number, number] },
    { check: report.compromised_accounts_check, title: 'VERIFICA ACCOUNT COMPROMESSI', result: report.compromised_accounts_findings, color: [234, 179, 8] as [number, number, number] },
    { check: report.data_integrity_check, title: 'VERIFICA INTEGRITA DATI', result: report.data_integrity_findings, color: [59, 130, 246] as [number, number, number] }
  ];

  findings.forEach(finding => {
    if (finding.check) {
      addNewPageIfNeeded(35);
      
      // Header with colored accent
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
      pdf.setFillColor(finding.color[0], finding.color[1], finding.color[2]);
      pdf.rect(margin, y, 4, 9, 'F');
      
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(finding.title, margin + 8, y + 6);
      
      y += 13;
      
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const resultText = finding.result || 'Nessuna anomalia rilevata';
      const resultLines = pdf.splitTextToSize(resultText, contentWidth - 10);
      pdf.text(resultLines, margin + 5, y);
      y += resultLines.length * 4.5 + 8;
    }
  });

  // Other findings
  if (report.other_findings) {
    addSectionHeader('ULTERIORI RISULTATI E NOTE TECNICHE', [100, 116, 139]);
    
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const otherLines = pdf.splitTextToSize(report.other_findings, contentWidth - 10);
    pdf.text(otherLines, margin + 5, y);
    y += otherLines.length * 4.5 + 8;
  }

  // ==================== CONCLUSIONS ====================
  addSectionHeader('CONCLUSIONI', [16, 185, 129]);

  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(134, 239, 172);
  const conclusionLines = pdf.splitTextToSize(report.conclusions, contentWidth - 16);
  const conclusionHeight = conclusionLines.length * 4.5 + 8;
  pdf.roundedRect(margin, y, contentWidth, conclusionHeight, 2, 2, 'FD');
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(conclusionLines, margin + 8, y + 5);
  y += conclusionHeight + 6;

  // Recommendations
  if (report.recommendations) {
    addSectionHeader('RACCOMANDAZIONI', [234, 179, 8]);

    pdf.setFillColor(254, 252, 232);
    pdf.setDrawColor(253, 224, 71);
    const recLines = pdf.splitTextToSize(report.recommendations, contentWidth - 16);
    const recHeight = recLines.length * 4.5 + 8;
    pdf.roundedRect(margin, y, contentWidth, recHeight, 2, 2, 'FD');
    
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(recLines, margin + 8, y + 5);
    y += recHeight + 8;
  }

  // ==================== SIGNATURE SECTION ====================
  addNewPageIfNeeded(70);
  y += 8;
  
  // Separator
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Two columns: date on left, signature on right
  const signatureBlockX = pageWidth - margin - 70;

  // Date section
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Data della perizia:', margin, y);
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(format(new Date(report.report_date), 'd MMMM yyyy', { locale: it }), margin, y + 6);

  // Technician signature section
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Il Tecnico Incaricato:', signatureBlockX, y);
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.technician_name, signatureBlockX, y + 6);
  
  if (report.technician_qualification) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 116, 139);
    pdf.text(report.technician_qualification, signatureBlockX, y + 12);
    y += 6;
  }

  y += 18;

  // Signature box
  if (report.technician_signature) {
    // Has signature - display it
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.roundedRect(signatureBlockX, y, 68, 28, 2, 2, 'FD');
    
    try {
      pdf.addImage(report.technician_signature, 'PNG', signatureBlockX + 4, y + 2, 60, 24);
    } catch (e) {
      console.log('Could not load signature');
    }
    y += 30;
  } else {
    // No signature - show placeholder line
    pdf.setDrawColor(100, 116, 139);
    pdf.line(signatureBlockX, y + 20, signatureBlockX + 68, y + 20);
    
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(7);
    pdf.text('(firma del tecnico)', signatureBlockX + 34, y + 26, { align: 'center' });
    y += 30;
  }

  // ==================== FOOTER ====================
  const footerY = pageHeight - 12;
  
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
  
  pdf.setTextColor(148, 163, 184);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Perizia n. ${report.report_number} | Documento generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')} | ${centro.business_name}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save
  const fileName = `Perizia-${report.report_number}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
