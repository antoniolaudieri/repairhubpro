import { jsPDF } from "jspdf";

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface DeviceInfo {
  fullName?: string;
  year?: string;
  imageUrl?: string;
  specs?: {
    ram?: string;
    storage?: string;
    display?: string;
    processor?: string;
  };
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
  deviceInfo?: DeviceInfo;
}

export async function generateQuotePDF(data: QuotePDFData): Promise<jsPDF> {
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
  const accentColor: [number, number, number] = [245, 158, 11]; // Amber

  // Draw decorative header background
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Decorative circle patterns
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.circle(pageWidth - 25, 30, 45, 'F');
  doc.circle(pageWidth - 55, 5, 30, 'F');
  doc.circle(30, 50, 20, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("PREVENTIVO", margin, 28);

  // Centro name in header
  if (data.centroName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(data.centroName.toUpperCase(), margin, 38);
  }

  // Quote number & date
  if (data.quoteNumber) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`N° ${data.quoteNumber}`, pageWidth - margin, 25, { align: "right" });
  }
  const today = new Date().toLocaleDateString("it-IT", { 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
  doc.setFontSize(9);
  doc.text(today, pageWidth - margin, 35, { align: "right" });

  y = 70;

  // Customer info box (left)
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, (pageWidth - margin * 3) / 2, 40, 3, 3, 'F');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin + 8, y + 10);
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(12);
  doc.text(data.customerName, margin + 8, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  doc.text(data.customerPhone, margin + 8, y + 28);
  if (data.customerEmail) {
    doc.text(data.customerEmail, margin + 8, y + 35);
  }

  // Device info box (right) with image
  const rightBoxX = margin + (pageWidth - margin * 3) / 2 + margin;
  const boxWidth = (pageWidth - margin * 3) / 2;
  
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.08 }));
  doc.roundedRect(rightBoxX, y, boxWidth, 40, 3, 3, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(rightBoxX, y, boxWidth, 40, 3, 3, 'S');
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DISPOSITIVO", rightBoxX + 8, y + 10);
  
  // Device name
  const deviceName = data.deviceInfo?.fullName || `${data.deviceType} ${data.deviceBrand} ${data.deviceModel}`.trim();
  doc.setTextColor(...darkColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  
  // Truncate if too long
  const maxDeviceWidth = boxWidth - 50;
  const deviceLines = doc.splitTextToSize(deviceName, maxDeviceWidth);
  doc.text(deviceLines[0], rightBoxX + 8, y + 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grayColor);
  
  let deviceInfoY = y + 28;
  if (data.deviceInfo?.year && data.deviceInfo.year !== "N/A") {
    doc.text(`Anno: ${data.deviceInfo.year}`, rightBoxX + 8, deviceInfoY);
    deviceInfoY += 7;
  }
  if (data.deviceInfo?.specs?.storage && data.deviceInfo.specs.storage !== "N/A") {
    doc.text(data.deviceInfo.specs.storage, rightBoxX + 8, deviceInfoY);
  }

  // Try to add device image
  if (data.deviceInfo?.imageUrl) {
    try {
      const imgSize = 28;
      const imgX = rightBoxX + boxWidth - imgSize - 6;
      const imgY = y + 6;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            doc.addImage(img, "JPEG", imgX, imgY, imgSize, imgSize);
          } catch (e) {
            console.log("Could not add device image to PDF");
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = data.deviceInfo!.imageUrl!;
        setTimeout(resolve, 2000);
      });
    } catch (e) {
      console.log("Image loading error");
    }
  }

  y += 50;

  // Issue description section
  if (data.issueDescription) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'S');
    
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ PROBLEMA SEGNALATO", margin + 8, y + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const issueLines = doc.splitTextToSize(data.issueDescription, pageWidth - margin * 2 - 16);
    doc.text(issueLines[0], margin + 8, y + 14);
    
    y += 24;
  }

  // Diagnosis if present
  if (data.diagnosis) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
    
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNOSI TECNICA", margin + 8, y + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - margin * 2 - 16);
    doc.text(diagnosisLines[0], margin + 8, y + 14);
    
    y += 24;
  }

  // Items table header
  doc.setFillColor(...darkColor);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DETTAGLIO COSTI", margin + 5, y + 7);
  
  y += 14;

  // Table header
  doc.setFillColor(...primaryColor);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  
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
    doc.rect(margin, y, pageWidth - margin * 2, 9, 'F');
    
    const descLines = doc.splitTextToSize(item.description, 85);
    doc.text(descLines[0], margin + 5, y + 6);
    doc.text(item.quantity.toString(), pageWidth - 70, y + 6, { align: "center" });
    doc.text(`€${item.unitPrice.toFixed(2)}`, pageWidth - 45, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(`€${itemTotal.toFixed(2)}`, pageWidth - margin - 5, y + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    y += 9;
  });

  // Labor cost row
  if (data.laborCost > 0) {
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, pageWidth - margin * 2, 9, 'F');
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...grayColor);
    doc.text("Manodopera", margin + 5, y + 6);
    doc.text("-", pageWidth - 70, y + 6, { align: "center" });
    doc.text("-", pageWidth - 45, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkColor);
    doc.text(`€${data.laborCost.toFixed(2)}`, pageWidth - margin - 5, y + 6, { align: "right" });
    
    y += 12;
  }

  // Total box
  y += 5;
  doc.setFillColor(...primaryColor);
  doc.roundedRect(pageWidth - margin - 80, y, 80, 22, 4, 4, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TOTALE", pageWidth - margin - 75, y + 8);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`€${data.totalCost.toFixed(2)}`, pageWidth - margin - 5, y + 17, { align: "right" });

  y += 32;

  // Notes section
  if (data.notes) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'F');
    
    doc.setTextColor(...grayColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOTE:", margin + 8, y + 8);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2 - 16);
    doc.text(noteLines.slice(0, 2), margin + 8, y + 15);
    
    y += 28;
  }

  // Validity section
  doc.setFillColor(254, 249, 195);
  doc.roundedRect(margin, y, 70, 15, 2, 2, 'F');
  doc.setTextColor(161, 98, 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VALIDITÀ PREVENTIVO", margin + 5, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("30 giorni dalla data", margin + 5, y + 12);

  // Signature box
  const sigBoxX = pageWidth - margin - 70;
  doc.setDrawColor(...grayColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(sigBoxX, y, 70, 25, 2, 2);
  doc.setTextColor(...grayColor);
  doc.setFontSize(7);
  doc.text("Firma per accettazione", sigBoxX + 5, y + 22);

  // Footer
  const footerY = pageHeight - 20;
  
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Documento generato da LabLinkRiparo | www.lablinkriparo.it", pageWidth / 2, footerY, { align: "center" });

  // Decorative footer line
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 4, pageWidth, 4, 'F');

  return doc;
}

export function downloadQuotePDF(data: QuotePDFData, filename?: string) {
  generateQuotePDF(data).then(doc => {
    const fileName = filename || `preventivo_${data.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  });
}

export async function getQuotePDFDataUrl(data: QuotePDFData): Promise<string> {
  const doc = await generateQuotePDF(data);
  return doc.output('dataurlstring');
}
