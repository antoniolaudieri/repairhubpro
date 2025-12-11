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

interface CentroInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  logoUrl?: string;
}

interface QuotePDFData {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
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
  centroInfo?: CentroInfo;
  validUntil?: string;
  deviceInfo?: DeviceInfo;
}

export async function generateQuotePDF(data: QuotePDFData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 0;

  // Color Palette - Elegant dark theme
  const primary: [number, number, number] = [37, 99, 235]; // Blue
  const primaryDark: [number, number, number] = [30, 64, 175];
  const dark: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [241, 245, 249];
  const accent: [number, number, number] = [245, 158, 11]; // Amber
  const success: [number, number, number] = [34, 197, 94];
  const white: [number, number, number] = [255, 255, 255];

  // ==================== HEADER SECTION ====================
  // Gradient header background
  doc.setFillColor(...primaryDark);
  doc.rect(0, 0, pageWidth, 52, 'F');
  
  // Lighter overlay strip
  doc.setFillColor(...primary);
  doc.rect(0, 42, pageWidth, 10, 'F');

  // Decorative circles
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.circle(pageWidth - 20, 25, 40, 'F');
  doc.circle(pageWidth - 50, 0, 25, 'F');
  doc.circle(25, 45, 15, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));

  // Centro Logo placeholder or initials
  const logoX = margin;
  const logoY = 8;
  const logoSize = 32;
  
  if (data.centroInfo?.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            // Draw white circle background
            doc.setFillColor(255, 255, 255);
            doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 2, 'F');
            doc.addImage(img, "PNG", logoX, logoY, logoSize, logoSize);
          } catch (e) {
            drawInitialsLogo(doc, logoX, logoY, logoSize, data.centroInfo?.name || "");
          }
          resolve();
        };
        img.onerror = () => {
          drawInitialsLogo(doc, logoX, logoY, logoSize, data.centroInfo?.name || "");
          resolve();
        };
        img.src = data.centroInfo.logoUrl!;
        setTimeout(resolve, 2000);
      });
    } catch {
      drawInitialsLogo(doc, logoX, logoY, logoSize, data.centroInfo?.name || "");
    }
  } else {
    drawInitialsLogo(doc, logoX, logoY, logoSize, data.centroInfo?.name || "LL");
  }

  // Centro Name - truncate if too long to avoid overlap with PREVENTIVO
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const centroName = data.centroInfo?.name || "LabLinkRiparo";
  const maxNameWidth = pageWidth - logoX - logoSize - 10 - 80; // Leave space for PREVENTIVO
  let truncatedName = centroName.toUpperCase();
  while (doc.getTextWidth(truncatedName) > maxNameWidth && truncatedName.length > 10) {
    truncatedName = truncatedName.slice(0, -1);
  }
  if (truncatedName !== centroName.toUpperCase()) {
    truncatedName += "...";
  }
  doc.text(truncatedName, logoX + logoSize + 10, 18);

  // Centro Details (smaller, below name)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setGState(doc.GState({ opacity: 0.9 }));
  
  let centroDetailY = 24;
  if (data.centroInfo?.address) {
    doc.text(data.centroInfo.address, logoX + logoSize + 10, centroDetailY);
    centroDetailY += 4;
  }
  
  const contactInfo = [];
  if (data.centroInfo?.phone) contactInfo.push(`Tel: ${data.centroInfo.phone}`);
  if (data.centroInfo?.email) contactInfo.push(data.centroInfo.email);
  if (contactInfo.length > 0) {
    doc.text(contactInfo.join(" - "), logoX + logoSize + 10, centroDetailY);
    centroDetailY += 4;
  }
  
  if (data.centroInfo?.vatNumber) {
    doc.text(`P.IVA: ${data.centroInfo.vatNumber}`, logoX + logoSize + 10, centroDetailY);
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // PREVENTIVO title on the right - separated from centro
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PREVENTIVO", pageWidth - margin, 16, { align: "right" });
  
  // Quote number & date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  if (data.quoteNumber) {
    doc.text(`N° ${data.quoteNumber}`, pageWidth - margin, 24, { align: "right" });
  }
  const today = new Date().toLocaleDateString("it-IT", { 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
  doc.text(today, pageWidth - margin, 32, { align: "right" });

  y = 62;

  // ==================== CUSTOMER & DEVICE SECTION ====================
  const boxWidth = (pageWidth - margin * 2 - 10) / 2;
  
  // Customer Box
  doc.setFillColor(...white);
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, boxWidth, 45, 4, 4, 'FD');
  
  // Customer header strip
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, boxWidth, 12, 4, 4, 'F');
  doc.setFillColor(...white);
  doc.rect(margin, y + 8, boxWidth, 4, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin + 8, y + 8);
  
  doc.setTextColor(...dark);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName, margin + 8, y + 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  doc.text(`Tel: ${data.customerPhone}`, margin + 8, y + 30);
  if (data.customerEmail) {
    doc.text(data.customerEmail, margin + 8, y + 38);
  }

  // Device Box
  const deviceBoxX = margin + boxWidth + 10;
  doc.setFillColor(...white);
  doc.setDrawColor(...lightGray);
  doc.roundedRect(deviceBoxX, y, boxWidth, 45, 4, 4, 'FD');
  
  // Device header strip
  doc.setFillColor(...accent);
  doc.roundedRect(deviceBoxX, y, boxWidth, 12, 4, 4, 'F');
  doc.setFillColor(...white);
  doc.rect(deviceBoxX, y + 8, boxWidth, 4, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DISPOSITIVO", deviceBoxX + 8, y + 8);
  
  // Device name - show full info
  const deviceNameParts = [];
  if (data.deviceType) deviceNameParts.push(data.deviceType);
  if (data.deviceBrand) deviceNameParts.push(data.deviceBrand);
  if (data.deviceModel) deviceNameParts.push(data.deviceModel);
  const deviceDisplayName = data.deviceInfo?.fullName || deviceNameParts.join(" ") || "N/A";
  
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const deviceLines = doc.splitTextToSize(deviceDisplayName, boxWidth - 50);
  doc.text(deviceLines[0], deviceBoxX + 8, y + 22);
  if (deviceLines[1]) {
    doc.setFontSize(9);
    doc.text(deviceLines[1], deviceBoxX + 8, y + 29);
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  
  let deviceDetailY = deviceLines[1] ? y + 36 : y + 30;
  
  // Show device type separately if we have brand/model
  if (data.deviceType && (data.deviceBrand || data.deviceModel)) {
    doc.text(`Tipo: ${data.deviceType}`, deviceBoxX + 8, deviceDetailY);
    deviceDetailY += 6;
  }
  
  if (data.deviceInfo?.year && data.deviceInfo.year !== "N/A") {
    doc.text(`Anno: ${data.deviceInfo.year}`, deviceBoxX + 8, deviceDetailY);
    deviceDetailY += 6;
  }
  if (data.deviceInfo?.specs?.storage && data.deviceInfo.specs.storage !== "N/A") {
    doc.text(`Storage: ${data.deviceInfo.specs.storage}`, deviceBoxX + 8, deviceDetailY);
  }

  // Device Image
  if (data.deviceInfo?.imageUrl) {
    try {
      const imgSize = 32;
      const imgX = deviceBoxX + boxWidth - imgSize - 6;
      const imgY = y + 10;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            doc.setFillColor(...lightGray);
            doc.roundedRect(imgX - 2, imgY - 2, imgSize + 4, imgSize + 4, 4, 4, 'F');
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

  y += 55;

  // ==================== ISSUE DESCRIPTION ====================
  if (data.issueDescription) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 4, 4, 'FD');
    
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PROBLEMA SEGNALATO", margin + 8, y + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    const issueLines = doc.splitTextToSize(data.issueDescription, pageWidth - margin * 2 - 16);
    doc.text(issueLines[0], margin + 8, y + 16);
    
    y += 26;
  }

  // Diagnosis
  if (data.diagnosis) {
    doc.setFillColor(...lightGray);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
    
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNOSI TECNICA", margin + 8, y + 7);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    const diagnosisLines = doc.splitTextToSize(data.diagnosis, pageWidth - margin * 2 - 16);
    doc.text(diagnosisLines[0], margin + 8, y + 14);
    
    y += 24;
  }

  // ==================== ITEMS TABLE ====================
  // Table Header
  doc.setFillColor(...dark);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DETTAGLIO COSTI", margin + 8, y + 8);
  
  y += 16;

  // Column headers
  doc.setFillColor(...primary);
  doc.setGState(doc.GState({ opacity: 0.1 }));
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setGState(doc.GState({ opacity: 1 }));
  
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIZIONE", margin + 5, y + 7);
  doc.text("QTÀ", pageWidth - 72, y + 7, { align: "center" });
  doc.text("PREZZO", pageWidth - 48, y + 7, { align: "center" });
  doc.text("TOTALE", pageWidth - margin - 5, y + 7, { align: "right" });
  
  y += 12;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const validItems = data.items.filter(i => i.description);
  validItems.forEach((item, index) => {
    const itemTotal = item.quantity * item.unitPrice;
    const isEven = index % 2 === 0;
    
    if (isEven) {
      doc.setFillColor(...lightGray);
      doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
    }
    
    doc.setTextColor(...dark);
    const descLines = doc.splitTextToSize(item.description, 90);
    doc.text(descLines[0], margin + 5, y + 7);
    
    doc.setTextColor(...gray);
    doc.text(item.quantity.toString(), pageWidth - 72, y + 7, { align: "center" });
    doc.text(`€${item.unitPrice.toFixed(2)}`, pageWidth - 48, y + 7, { align: "center" });
    
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.text(`€${itemTotal.toFixed(2)}`, pageWidth - margin - 5, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    
    y += 10;
  });

  // Labor cost row
  if (data.laborCost > 0) {
    doc.setFillColor(...lightGray);
    doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
    
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...gray);
    doc.text("Manodopera", margin + 5, y + 7);
    doc.text("-", pageWidth - 72, y + 7, { align: "center" });
    doc.text("-", pageWidth - 48, y + 7, { align: "center" });
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`€${data.laborCost.toFixed(2)}`, pageWidth - margin - 5, y + 7, { align: "right" });
    
    y += 12;
  }

  // ==================== TOTAL BOX ====================
  y += 5;
  
  // Total background
  doc.setFillColor(...primary);
  doc.roundedRect(pageWidth - margin - 90, y, 90, 28, 5, 5, 'F');
  
  // Decorative accent
  doc.setFillColor(...primaryDark);
  doc.roundedRect(pageWidth - margin - 90, y, 90, 10, 5, 5, 'F');
  doc.rect(pageWidth - margin - 90, y + 5, 90, 5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("TOTALE PREVENTIVO", pageWidth - margin - 85, y + 8);
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`€ ${data.totalCost.toFixed(2)}`, pageWidth - margin - 5, y + 22, { align: "right" });

  y += 38;

  // ==================== NOTES SECTION ====================
  if (data.notes) {
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(147, 197, 253);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, 'FD');
    
    doc.setTextColor(...primary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOTE E CONDIZIONI", margin + 8, y + 8);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    const noteLines = doc.splitTextToSize(data.notes, pageWidth - margin * 2 - 16);
    doc.text(noteLines.slice(0, 2), margin + 8, y + 16);
    
    y += 28;
  }

  // ==================== VALIDITY & SIGNATURE ====================
  // Validity badge
  doc.setFillColor(254, 249, 195);
  doc.setDrawColor(250, 204, 21);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, 80, 20, 3, 3, 'FD');
  
  doc.setTextColor(161, 98, 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("VALIDITA PREVENTIVO", margin + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("30 giorni dalla data", margin + 5, y + 16);

  // Signature box
  const sigBoxWidth = 85;
  const sigBoxX = pageWidth - margin - sigBoxWidth;
  doc.setFillColor(...white);
  doc.setDrawColor(...gray);
  doc.setLineWidth(0.3);
  doc.roundedRect(sigBoxX, y, sigBoxWidth, 28, 3, 3, 'S');
  
  // Signature line
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(sigBoxX + 5, y + 20, sigBoxX + sigBoxWidth - 5, y + 20);
  
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Firma per accettazione", sigBoxX + sigBoxWidth / 2, y + 26, { align: "center" });

  // ==================== FOOTER ====================
  const footerY = pageHeight - 18;
  
  // Footer line
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  // Footer text
  doc.setTextColor(...gray);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  
  if (data.centroInfo?.name) {
    doc.text(`${data.centroInfo.name}${data.centroInfo.vatNumber ? ` • P.IVA ${data.centroInfo.vatNumber}` : ''}`, margin, footerY);
  }
  
  doc.text("Documento generato con LabLinkRiparo", pageWidth - margin, footerY, { align: "right" });

  // Decorative footer bar
  doc.setFillColor(...primary);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

  return doc;
}

function drawInitialsLogo(doc: jsPDF, x: number, y: number, size: number, name: string) {
  // Draw circle background
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size/2, y + size/2, size/2, 'F');
  
  // Get initials
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || "LL";
  
  // Draw initials
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(initials, x + size/2, y + size/2 + 4, { align: "center" });
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

export async function getQuotePDFBase64(data: QuotePDFData): Promise<string> {
  const doc = await generateQuotePDF(data);
  // Get arraybuffer and convert to base64
  const arrayBuffer = doc.output('arraybuffer');
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
