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
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > 270) {
      pdf.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // Header with Centro branding - increased height for better spacing
  const headerHeight = 50;
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');

  const logoX = margin;
  const textStartX = centro.logo_url ? margin + 38 : margin;
  const headerTextY = 20; // Start text lower in header

  // Try to load logo
  if (centro.logo_url) {
    try {
      pdf.addImage(centro.logo_url, 'PNG', logoX, 10, 32, 32);
    } catch (e) {
      console.log('Could not load logo');
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PERIZIA TECNICA FORENSE', textStartX, headerTextY);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(centro.business_name, textStartX, headerTextY + 7);
  pdf.text(`${centro.address} | Tel: ${centro.phone}`, textStartX, headerTextY + 13);
  pdf.text(`Email: ${centro.email}${centro.vat_number ? ` | P.IVA: ${centro.vat_number}` : ''}`, textStartX, headerTextY + 19);

  // Report number and date badge - positioned within header
  const badgeX = pageWidth - margin - 45;
  const badgeY = 12;
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(badgeX, badgeY, 42, 26, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.text('N. PERIZIA', badgeX + 21, badgeY + 6, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.report_number, badgeX + 21, badgeY + 13, { align: 'center' });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(format(new Date(report.report_date), 'dd/MM/yyyy'), badgeX + 21, badgeY + 20, { align: 'center' });

  y = headerHeight + 8;

  // Client and Recipient info
  pdf.setTextColor(30, 41, 59);
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(margin, y, contentWidth, 35, 2, 2, 'F');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COMMITTENTE', margin + 5, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(report.customer.name, margin + 5, y + 14);
  pdf.text(`Tel: ${report.customer.phone}`, margin + 5, y + 20);
  if (report.customer.email) {
    pdf.text(`Email: ${report.customer.email}`, margin + 5, y + 26);
  }
  if (report.customer.address) {
    pdf.text(report.customer.address, margin + 5, y + 32);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.text('DESTINATARIO PERIZIA', margin + contentWidth / 2 + 5, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(purposeLabels[report.purpose] || report.purpose, margin + contentWidth / 2 + 5, y + 14);
  if (report.recipient_name) {
    pdf.text(report.recipient_name, margin + contentWidth / 2 + 5, y + 20);
  }
  if (report.recipient_role) {
    pdf.text(report.recipient_role, margin + contentWidth / 2 + 5, y + 26);
  }

  y += 42;

  // Device section
  pdf.setFillColor(30, 41, 59);
  pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DISPOSITIVO OGGETTO DI ANALISI', margin + 5, y + 5.5);

  y += 12;

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);
  const deviceInfo = [
    ['Tipo:', report.device_type],
    ['Marca:', report.device_brand || '-'],
    ['Modello:', report.device_model || '-'],
    ['Seriale:', report.device_serial || '-'],
    ['IMEI:', report.device_imei || '-'],
    ['Condizione:', report.device_condition || '-']
  ];

  deviceInfo.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const colWidth = contentWidth / 3;
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin + 5 + col * colWidth, y + row * 7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, margin + 25 + col * colWidth, y + row * 7);
  });

  y += 18;

  // Analysis Summary
  addNewPageIfNeeded(40);
  pdf.setFillColor(30, 41, 59);
  pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SOMMARIO DELLE OPERAZIONI DI ANALISI', margin + 5, y + 5.5);

  y += 12;

  pdf.setTextColor(51, 65, 85);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const summaryLines = pdf.splitTextToSize(report.analysis_summary, contentWidth - 10);
  pdf.text(summaryLines, margin + 5, y);
  y += summaryLines.length * 4 + 8;

  // Findings sections
  // Using simple text markers instead of emojis (jsPDF doesn't support emojis)
  const findings = [
    { check: report.malware_check, title: 'VERIFICA MALWARE', result: report.malware_findings, marker: '[M]' },
    { check: report.spyware_check, title: 'VERIFICA SPYWARE / SOFTWARE SPIA', result: report.spyware_findings, marker: '[S]' },
    { check: report.compromised_accounts_check, title: 'VERIFICA ACCOUNT COMPROMESSI', result: report.compromised_accounts_findings, marker: '[A]' },
    { check: report.data_integrity_check, title: 'VERIFICA INTEGRITA DATI', result: report.data_integrity_findings, marker: '[D]' }
  ];

  findings.forEach(finding => {
    if (finding.check) {
      addNewPageIfNeeded(30);
      
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${finding.marker}  ${finding.title}`, margin + 5, y + 5.5);
      
      y += 12;
      
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const resultText = finding.result || 'Nessuna anomalia rilevata';
      const resultLines = pdf.splitTextToSize(resultText, contentWidth - 10);
      pdf.text(resultLines, margin + 5, y);
      y += resultLines.length * 4 + 8;
    }
  });

  // Other findings
  if (report.other_findings) {
    addNewPageIfNeeded(30);
    pdf.setFillColor(241, 245, 249);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ULTERIORI RISULTATI E NOTE TECNICHE', margin + 5, y + 5.5);
    
    y += 12;
    
    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const otherLines = pdf.splitTextToSize(report.other_findings, contentWidth - 10);
    pdf.text(otherLines, margin + 5, y);
    y += otherLines.length * 4 + 8;
  }

  // Conclusions
  addNewPageIfNeeded(50);
  pdf.setFillColor(59, 130, 246);
  pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONCLUSIONI', margin + 5, y + 5.5);

  y += 12;

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const conclusionLines = pdf.splitTextToSize(report.conclusions, contentWidth - 10);
  pdf.text(conclusionLines, margin + 5, y);
  y += conclusionLines.length * 4 + 8;

  // Recommendations
  if (report.recommendations) {
    addNewPageIfNeeded(30);
    pdf.setFillColor(254, 243, 199);
    pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RACCOMANDAZIONI', margin + 5, y + 5.5);

    y += 12;

    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const recLines = pdf.splitTextToSize(report.recommendations, contentWidth - 10);
    pdf.text(recLines, margin + 5, y);
    y += recLines.length * 4 + 8;
  }

  // Signature section
  addNewPageIfNeeded(50);
  y += 10;
  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y, pageWidth - margin, y);

  y += 10;

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Data: ${format(new Date(report.report_date), 'd MMMM yyyy', { locale: it })}`, margin, y);

  pdf.text('Il Tecnico:', pageWidth - margin - 60, y);
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.technician_name, pageWidth - margin - 60, y);
  if (report.technician_qualification) {
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(report.technician_qualification, pageWidth - margin - 60, y);
  }

  y += 15;
  pdf.setDrawColor(100, 116, 139);
  pdf.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  pdf.text('(firma)', pageWidth - margin - 30, y + 4, { align: 'center' });

  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 15;
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(7);
  pdf.text(
    `Perizia n. ${report.report_number} - Documento generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')} - ${centro.business_name}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save
  const fileName = `Perizia-${report.report_number}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
