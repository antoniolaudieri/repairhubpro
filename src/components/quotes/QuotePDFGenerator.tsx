import { jsPDF } from "jspdf";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface QuotePDFData {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand: string;
  deviceModel: string;
  issueDescription: string;
  diagnosis?: string;
  notes?: string;
  items: QuoteItem[];
  laborCost: number;
  partsCost: number;
  totalCost: number;
  quoteNumber?: string;
  centroName?: string;
  centroAddress?: string;
  centroPhone?: string;
  centroEmail?: string;
  centroLogo?: string;
  validUntil?: string;
}

export function generateQuotePDF(data: QuotePDFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const darkColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];

  // Draw decorative header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Decorative circle patterns
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 30, 25, 40, 'F');
  doc.circle(pageWidth - 60, 10, 25, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("PREVENTIVO", margin, 32);

  // Quote number
  if (data.quoteNumber) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${data.quoteNumber}`, pageWidth - margin, 25, { align: "right" });
  }

  // Date
  doc.setFontSize(10);
  const today = new Date().toLocaleDateString("it-IT", { 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
  doc.text(today, pageWidth - margin, 35, { align: "right" });

  y = 65;

  // Centro info box (left)
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, (pageWidth - margin * 3) / 2, 45, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DA:", margin + 8, y + 10);
  
  doc.setFontSize(11);
  doc.text(data.centroName || "Centro Assistenza", margin + 8, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  if (data.centroAddress) {
    doc.text(data.centroAddress, margin + 8, y + 28);
  }
  if (data.centroPhone) {
    doc.text(`Tel: ${data.centroPhone}`, margin + 8, y + 36);
  }

  // Customer info box (right)
  const rightBoxX = margin + (pageWidth - margin * 3) / 2 + margin;
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.roundedRect(rightBoxX, y, (pageWidth - margin * 3) / 2, 45, 3, 3, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightBoxX, y, (pageWidth - margin * 3) / 2, 45, 3, 3, 'S');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE:", rightBoxX + 8, y + 10);
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.text(data.customerName, rightBoxX + 8, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(data.customerPhone, rightBoxX + 8, y + 28);
  if (data.customerEmail) {
    doc.text(data.customerEmail, rightBoxX + 8, y + 36);
  }

  y += 60;

  // Device info section
  doc.setFillColor(...darkColor);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DISPOSITIVO", margin + 5, y + 5.5);
  
  y += 15;
  
  // Device details card
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 3, 3, 'F');
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.deviceType} ${data.deviceBrand} ${data.deviceModel}`, margin + 10, y + 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  
  // Issue description
  const issueLines = doc.splitTextToSize(`Problema: ${data.issueDescription}`, pageWidth - margin * 2 - 20);
  doc.text(issueLines, margin + 10, y + 22);

  y += 45;

  // Diagnosis if present
  if (data.diagnosis) {
    doc.setFillColor(255, 251, 235); // Amber light
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'S');
    
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNOSI TECNICA", margin + 8, y + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - margin * 2 - 16);
    doc.text(diagnosisLines, margin + 8, y + 16);
    
    y += 32;
  }

  // Items table header
  doc.setFillColor(...darkColor);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DETTAGLIO COSTI", margin + 5, y + 5.5);
  
  y += 12;

  // Table header
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIZIONE", margin + 5, y + 5.5);
  doc.text("QTÀ", pageWidth - 70, y + 5.5, { align: "center" });
  doc.text("PREZZO", pageWidth - 45, y + 5.5, { align: "center" });
  doc.text("TOTALE", pageWidth - margin - 5, y + 5.5, { align: "right" });
  
  y += 10;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  
  const validItems = data.items.filter(i => i.description);
  validItems.forEach((item, index) => {
    const itemTotal = item.quantity * item.unitPrice;
    const bgColor = index % 2 === 0 ? [255, 255, 255] : lightGray;
    
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    
    doc.text(item.description, margin + 5, y + 5.5);
    doc.text(item.quantity.toString(), pageWidth - 70, y + 5.5, { align: "center" });
    doc.text(`€${item.unitPrice.toFixed(2)}`, pageWidth - 45, y + 5.5, { align: "center" });
    doc.text(`€${itemTotal.toFixed(2)}`, pageWidth - margin - 5, y + 5.5, { align: "right" });
    
    y += 8;
  });

  // Labor cost row
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setFont("helvetica", "italic");
  doc.text("Manodopera", margin + 5, y + 5.5);
  doc.text("-", pageWidth - 70, y + 5.5, { align: "center" });
  doc.text("-", pageWidth - 45, y + 5.5, { align: "center" });
  doc.text(`€${data.laborCost.toFixed(2)}`, pageWidth - margin - 5, y + 5.5, { align: "right" });
  
  y += 12;

  // Subtotals
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 80, y, pageWidth - margin, y);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...grayColor);
  doc.setFontSize(9);
  doc.text("Subtotale Ricambi:", pageWidth - 80, y);
  doc.text(`€${data.partsCost.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
  
  y += 6;
  doc.text("Manodopera:", pageWidth - 80, y);
  doc.text(`€${data.laborCost.toFixed(2)}`, pageWidth - margin, y, { align: "right" });

  y += 10;

  // Total box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth - 90, y, 70, 18, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTALE", pageWidth - 85, y + 7);
  doc.setFontSize(14);
  doc.text(`€${data.totalCost.toFixed(2)}`, pageWidth - margin - 5, y + 13, { align: "right" });

  y += 30;

  // Notes section
  if (data.notes) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');
    
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOTE:", margin + 8, y + 8);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2 - 16);
    doc.text(noteLines, margin + 8, y + 16);
    
    y += 32;
  }

  // Validity section
  if (data.validUntil) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Preventivo valido fino al: ${data.validUntil}`, margin, y);
    y += 10;
  }

  // Footer
  const footerY = pageHeight - 25;
  
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Grazie per aver scelto i nostri servizi.", pageWidth / 2, footerY, { align: "center" });
  doc.text("Per accettare il preventivo, contattaci o accedi al portale cliente.", pageWidth / 2, footerY + 5, { align: "center" });

  // Decorative footer line
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

  return doc;
}

export function downloadQuotePDF(data: QuotePDFData, filename?: string) {
  const doc = generateQuotePDF(data);
  const fileName = filename || `preventivo_${data.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export function getQuotePDFDataUrl(data: QuotePDFData): string {
  const doc = generateQuotePDF(data);
  return doc.output('dataurlstring');
}