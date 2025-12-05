import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

type ItemStatus = 'ok' | 'damaged' | 'not_working' | 'not_applicable';

interface ChecklistItem {
  item_name: string;
  category: string;
  status: ItemStatus;
  notes: string;
  photo_url: string;
}

interface ChecklistPDFData {
  checklistType: 'pre_repair' | 'post_repair';
  customerName: string;
  deviceInfo: string;
  items: ChecklistItem[];
  generalNotes: string;
  signature: string | null;
  createdAt: string;
}

const statusLabels: Record<ItemStatus, string> = {
  ok: 'OK',
  damaged: 'Danneggiato',
  not_working: 'Non Funziona',
  not_applicable: 'N/A'
};

const statusColors: Record<ItemStatus, [number, number, number]> = {
  ok: [34, 197, 94], // green
  damaged: [234, 179, 8], // yellow
  not_working: [239, 68, 68], // red
  not_applicable: [156, 163, 175] // gray
};

export function generateChecklistPDF(data: ChecklistPDFData): void {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Header
  pdf.setFillColor(30, 41, 59); // slate-800
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CHECKLIST RIPARAZIONE', pageWidth / 2, 18, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  const typeLabel = data.checklistType === 'pre_repair' ? 'PRE-RIPARAZIONE' : 'POST-RIPARAZIONE';
  pdf.text(typeLabel, pageWidth / 2, 28, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text(format(new Date(data.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it }), pageWidth / 2, 36, { align: 'center' });

  y = 50;

  // Customer & Device Info
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLIENTE:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.customerName, margin + 25, y);

  y += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('DISPOSITIVO:', margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.deviceInfo, margin + 35, y);

  y += 12;

  // Summary Box
  const summary = {
    ok: data.items.filter(i => i.status === 'ok').length,
    damaged: data.items.filter(i => i.status === 'damaged').length,
    not_working: data.items.filter(i => i.status === 'not_working').length,
    not_applicable: data.items.filter(i => i.status === 'not_applicable').length,
  };

  pdf.setFillColor(241, 245, 249); // slate-100
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
  
  const boxWidth = (pageWidth - margin * 2) / 4;
  let boxX = margin;

  Object.entries(summary).forEach(([status, count]) => {
    const color = statusColors[status as ItemStatus];
    pdf.setFillColor(...color);
    pdf.circle(boxX + 8, y + 9, 3, 'F');
    
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
    pdf.text(`${statusLabels[status as ItemStatus]}: ${count}`, boxX + 14, y + 10);
    boxX += boxWidth;
  });

  y += 25;

  // Items by Category
  const categories = [...new Set(data.items.map(item => item.category))];
  
  categories.forEach(category => {
    // Check if we need a new page
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }

    // Category Header
    pdf.setFillColor(226, 232, 240); // slate-200
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(category.toUpperCase(), margin + 3, y + 5.5);
    
    y += 12;

    // Items in category
    const categoryItems = data.items.filter(item => item.category === category);
    
    categoryItems.forEach(item => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      // Item row
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.item_name, margin + 2, y);

      // Status badge
      const statusColor = statusColors[item.status];
      const statusLabel = statusLabels[item.status];
      const statusWidth = pdf.getTextWidth(statusLabel) + 6;
      
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(pageWidth - margin - statusWidth - 2, y - 4, statusWidth, 6, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.text(statusLabel, pageWidth - margin - statusWidth + 1, y - 0.5);

      y += 5;

      // Notes if present
      if (item.notes) {
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        const noteLines = pdf.splitTextToSize(`Note: ${item.notes}`, pageWidth - margin * 2 - 10);
        pdf.text(noteLines, margin + 5, y);
        y += noteLines.length * 4;
      }

      y += 3;
    });

    y += 5;
  });

  // General Notes
  if (data.generalNotes) {
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFillColor(254, 243, 199); // amber-100
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTE GENERALI', margin + 3, y + 5.5);
    
    y += 12;

    pdf.setTextColor(51, 65, 85);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(data.generalNotes, pageWidth - margin * 2 - 4);
    pdf.text(noteLines, margin + 2, y);
    y += noteLines.length * 4 + 5;
  }

  // Signature
  if (data.signature) {
    if (y > 230) {
      pdf.addPage();
      y = 20;
    }

    y += 10;
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, y, pageWidth - margin, y);
    
    y += 8;
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FIRMA CLIENTE', margin, y);
    
    y += 5;
    
    // Add signature image
    try {
      pdf.addImage(data.signature, 'PNG', margin, y, 60, 25);
    } catch (e) {
      console.error('Error adding signature to PDF:', e);
    }

    y += 30;
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.text(`Firmato digitalmente il ${format(new Date(data.createdAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}`, margin, y);
  }

  // Footer
  const footerY = pdf.internal.pageSize.getHeight() - 10;
  pdf.setTextColor(156, 163, 175);
  pdf.setFontSize(8);
  pdf.text('Documento generato automaticamente - Checklist Riparazione', pageWidth / 2, footerY, { align: 'center' });

  // Save
  const fileName = `checklist-${data.checklistType}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
  pdf.save(fileName);
}
