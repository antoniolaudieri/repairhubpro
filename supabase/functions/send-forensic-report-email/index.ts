import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
  enabled: boolean;
}

const purposeLabels: Record<string, string> = {
  avvocato: 'Avvocato',
  polizia_postale: 'Polizia Postale',
  assicurazione: 'Assicurazione',
  altro: 'Altro'
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function generateForensicPDF(report: any, centro: any): string {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 25) {
      pdf.addPage();
      y = 20;
      return true;
    }
    return false;
  };

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
  
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, headerHeight, 'F');
  
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, headerHeight - 3, pageWidth, 3, 'F');

  const textStartX = margin;
  const headerTextY = 14;

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
  pdf.text(formatDate(report.report_date), badgeX + 22, badgeY + 26, { align: 'center' });

  y = headerHeight + 10;

  // ==================== CLIENT & RECIPIENT ====================
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 38, 3, 3, 'F');
  
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
  pdf.text(report.customer?.name || 'N/D', margin + 10, y + 15);
  
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Tel: ${report.customer?.phone || 'N/D'}`, margin + 10, y + 22);
  if (report.customer?.email) {
    pdf.text(`Email: ${report.customer.email}`, margin + 10, y + 28);
  }
  if (report.customer?.address) {
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
    ['Tipo:', report.device_type || '-'],
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
  const summaryLines = pdf.splitTextToSize(report.analysis_summary || '', contentWidth - 10);
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
  const conclusionLines = pdf.splitTextToSize(report.conclusions || '', contentWidth - 16);
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
    
    let recText = '';
    try {
      const recs = typeof report.recommendations === 'string' 
        ? JSON.parse(report.recommendations) 
        : report.recommendations;
      if (Array.isArray(recs)) {
        recText = recs.map((r: string) => `• ${r}`).join('\n');
      } else {
        recText = String(report.recommendations);
      }
    } catch {
      recText = String(report.recommendations);
    }
    
    const recLines = pdf.splitTextToSize(recText, contentWidth - 16);
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
  
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;

  const signatureBlockX = pageWidth - margin - 70;

  // Date section
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Data della perizia:', margin, y);
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatDateLong(report.report_date), margin, y + 6);

  // Technician signature section
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Il Tecnico Incaricato:', signatureBlockX, y);
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.technician_name || 'N/D', signatureBlockX, y + 6);
  
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
    `Perizia n. ${report.report_number} | Documento generato il ${formatDateTime(new Date())} | ${centro.business_name}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  return pdf.output('datauristring').split(',')[1];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, centroId, customerEmail, customerName } = await req.json();
    console.log("Sending forensic report email:", { reportId, centroId, customerEmail });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: report, error: reportError } = await supabase
      .from("forensic_reports")
      .select("*, customer:customers(id, name, email, phone, address)")
      .eq("id", reportId)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    const { data: centro, error: centroError } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, vat_number, settings")
      .eq("id", centroId)
      .single();

    if (centroError || !centro) throw new Error("Centro not found");

    console.log("Generating PDF...");
    const pdfBase64 = generateForensicPDF(report, centro);
    console.log("PDF generated successfully");

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f5"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#1e293b,#334155);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">📋 Perizia Tecnica Forense</h1><p style="color:#94a3b8;margin:10px 0 0 0">N. ${report.report_number}</p></div><div style="background:#fff;padding:30px;border-radius:0 0 12px 12px"><p style="color:#374151;font-size:16px">Gentile <strong>${customerName}</strong>,</p><p style="color:#374151;font-size:14px">In allegato alla presente troverà la perizia tecnica forense relativa al dispositivo da Lei consegnato.</p><div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#1e293b;margin:0 0 15px 0">Riepilogo</h3><p style="margin:5px 0;font-size:14px"><strong>N. Perizia:</strong> ${report.report_number}</p><p style="margin:5px 0;font-size:14px"><strong>Dispositivo:</strong> ${report.device_brand || ""} ${report.device_model || ""}</p><p style="margin:5px 0;font-size:14px"><strong>Destinatario:</strong> ${purposeLabels[report.purpose] || report.purpose}</p></div><p style="color:#374151;font-size:14px;margin-top:20px">Cordiali saluti,<br><strong>${centro.business_name}</strong></p></div><div style="text-align:center;padding:20px"><p style="color:#64748b;font-size:12px">${centro.business_name} | ${centro.address} | ${centro.phone}</p></div></div></body></html>`;

    const subject = `Perizia Tecnica n. ${report.report_number} - ${centro.business_name}`;
    const pdfFilename = `Perizia_${report.report_number}.pdf`;

    const settings = centro.settings as { smtp_config?: SmtpConfig } | null;
    const smtpConfig = settings?.smtp_config;

    let emailSent = false;

    if (smtpConfig?.enabled && smtpConfig?.host && smtpConfig?.user && smtpConfig?.password) {
      console.log("Using Centro SMTP configuration");
      try {
        const client = new SMTPClient({
          connection: {
            hostname: smtpConfig.host,
            port: smtpConfig.port || 587,
            tls: smtpConfig.secure !== false,
            auth: {
              username: smtpConfig.user,
              password: smtpConfig.password,
            },
          },
        });

        await client.send({
          from: smtpConfig.from_email 
            ? `${smtpConfig.from_name || centro.business_name} <${smtpConfig.from_email}>`
            : `${centro.business_name} <${smtpConfig.user}>`,
          to: customerEmail,
          subject: subject,
          html: emailHtml,
          attachments: [
            {
              filename: pdfFilename,
              content: pdfBase64,
              encoding: "base64",
              contentType: "application/pdf",
            },
          ],
        });

        await client.close();
        emailSent = true;
        console.log("Email sent via SMTP successfully with PDF attachment");
      } catch (smtpError) {
        console.error("SMTP send failed:", smtpError);
      }
    }

    if (!emailSent) {
      console.log("Using Resend fallback");
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: `${centro.business_name} <onboarding@resend.dev>`,
        to: [customerEmail],
        subject: subject,
        html: emailHtml,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBase64,
          },
        ],
      });
      console.log("Email sent via Resend successfully with PDF attachment");
    }

    await supabase
      .from("forensic_reports")
      .update({ 
        sent_at: new Date().toISOString(),
        sent_to_email: customerEmail,
        status: 'sent'
      })
      .eq("id", reportId);

    console.log("Email sent successfully with PDF");
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
