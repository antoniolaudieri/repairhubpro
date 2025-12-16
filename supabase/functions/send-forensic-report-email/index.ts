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

function generateForensicPDF(report: any, centro: any, customer: any): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const purposeLabels: Record<string, string> = {
    avvocato: "Avvocato",
    polizia_postale: "Polizia Postale",
    assicurazione: "Assicurazione",
    altro: "Altro",
  };

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PERIZIA TECNICA FORENSE", pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`N. ${report.report_number}`, pageWidth / 2, 32, { align: "center" });

  y = 55;
  doc.setTextColor(0, 0, 0);

  // Centro info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CENTRO ASSISTENZA", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(centro.business_name || "", margin, y);
  y += 5;
  doc.text(centro.address || "", margin, y);
  y += 5;
  doc.text(`Tel: ${centro.phone || ""} - Email: ${centro.email || ""}`, margin, y);
  if (centro.vat_number) {
    y += 5;
    doc.text(`P.IVA: ${centro.vat_number}`, margin, y);
  }

  y += 15;

  // Customer info
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${customer?.name || "N/D"}`, margin, y);
  y += 5;
  doc.text(`Email: ${customer?.email || "N/D"}`, margin, y);
  y += 5;
  doc.text(`Tel: ${customer?.phone || "N/D"}`, margin, y);

  y += 15;

  // Device info
  doc.setFont("helvetica", "bold");
  doc.text("DISPOSITIVO ANALIZZATO", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Tipo: ${report.device_type || "N/D"}`, margin, y);
  y += 5;
  doc.text(`Marca: ${report.device_brand || "N/D"} - Modello: ${report.device_model || "N/D"}`, margin, y);
  if (report.device_serial) {
    y += 5;
    doc.text(`Seriale: ${report.device_serial}`, margin, y);
  }
  if (report.device_imei) {
    y += 5;
    doc.text(`IMEI: ${report.device_imei}`, margin, y);
  }

  y += 15;

  // Purpose
  doc.setFont("helvetica", "bold");
  doc.text("FINALITÀ PERIZIA", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(purposeLabels[report.purpose] || report.purpose || "N/D", margin, y);
  if (report.recipient_name) {
    y += 5;
    doc.text(`Destinatario: ${report.recipient_name} ${report.recipient_role ? `(${report.recipient_role})` : ""}`, margin, y);
  }

  y += 15;

  // Analysis summary
  doc.setFont("helvetica", "bold");
  doc.text("RIEPILOGO ANALISI", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(report.analysis_summary || "", contentWidth);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  // Check if we need a new page
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Check results
  doc.setFont("helvetica", "bold");
  doc.text("RISULTATI VERIFICHE", margin, y);
  y += 8;

  const checks = [
    { label: "Malware", checked: report.malware_check, findings: report.malware_findings },
    { label: "Spyware", checked: report.spyware_check, findings: report.spyware_findings },
    { label: "Account Compromessi", checked: report.compromised_accounts_check, findings: report.compromised_accounts_findings },
    { label: "Integrità Dati", checked: report.data_integrity_check, findings: report.data_integrity_findings },
  ];

  for (const check of checks) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const status = check.checked ? "✓ RILEVATO" : "✗ NON RILEVATO";
    doc.text(`${check.label}: ${status}`, margin, y);
    y += 5;
    if (check.findings) {
      doc.setFont("helvetica", "normal");
      const findingsLines = doc.splitTextToSize(check.findings, contentWidth);
      doc.text(findingsLines, margin, y);
      y += findingsLines.length * 4 + 5;
    }
  }

  // Other findings
  if (report.other_findings) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    y += 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ALTRE EVIDENZE", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const otherLines = doc.splitTextToSize(report.other_findings, contentWidth);
    doc.text(otherLines, margin, y);
    y += otherLines.length * 5 + 10;
  }

  // Conclusions
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.text("CONCLUSIONI", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const conclusionLines = doc.splitTextToSize(report.conclusions || "", contentWidth);
  doc.text(conclusionLines, margin, y);
  y += conclusionLines.length * 5 + 10;

  // Recommendations
  if (report.recommendations) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.text("RACCOMANDAZIONI", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    try {
      const recs = typeof report.recommendations === 'string' 
        ? JSON.parse(report.recommendations) 
        : report.recommendations;
      if (Array.isArray(recs)) {
        for (const rec of recs) {
          const recLines = doc.splitTextToSize(`• ${rec}`, contentWidth);
          doc.text(recLines, margin, y);
          y += recLines.length * 5 + 2;
        }
      }
    } catch {
      const recLines = doc.splitTextToSize(String(report.recommendations), contentWidth);
      doc.text(recLines, margin, y);
    }
  }

  // Technician signature
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("TECNICO RESPONSABILE", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(report.technician_name || "N/D", margin, y);
  if (report.technician_qualification) {
    y += 5;
    doc.text(report.technician_qualification, margin, y);
  }

  // Date and footer
  y += 15;
  const reportDate = new Date(report.report_date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Data perizia: ${reportDate}`, margin, y);

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `${centro.business_name} - Documento generato automaticamente - Pagina ${i} di ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return doc.output('datauristring').split(',')[1]; // Return base64
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

    // Get report data
    const { data: report, error: reportError } = await supabase
      .from("forensic_reports")
      .select("*, customer:customers(id, name, email, phone, address)")
      .eq("id", reportId)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    // Get centro data including settings
    const { data: centro, error: centroError } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, vat_number, settings")
      .eq("id", centroId)
      .single();

    if (centroError || !centro) throw new Error("Centro not found");

    const purposeLabels: Record<string, string> = {
      avvocato: "Avvocato",
      polizia_postale: "Polizia Postale",
      assicurazione: "Assicurazione",
      altro: "Altro",
    };

    // Generate PDF
    console.log("Generating PDF...");
    const pdfBase64 = generateForensicPDF(report, centro, report.customer);
    console.log("PDF generated successfully");

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f5"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#1e293b,#334155);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">📋 Perizia Tecnica Forense</h1><p style="color:#94a3b8;margin:10px 0 0 0">N. ${report.report_number}</p></div><div style="background:#fff;padding:30px;border-radius:0 0 12px 12px"><p style="color:#374151;font-size:16px">Gentile <strong>${customerName}</strong>,</p><p style="color:#374151;font-size:14px">In allegato alla presente troverà la perizia tecnica forense relativa al dispositivo da Lei consegnato.</p><div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#1e293b;margin:0 0 15px 0">Riepilogo</h3><p style="margin:5px 0;font-size:14px"><strong>N. Perizia:</strong> ${report.report_number}</p><p style="margin:5px 0;font-size:14px"><strong>Dispositivo:</strong> ${report.device_brand || ""} ${report.device_model || ""}</p><p style="margin:5px 0;font-size:14px"><strong>Destinatario:</strong> ${purposeLabels[report.purpose] || report.purpose}</p></div><p style="color:#374151;font-size:14px;margin-top:20px">Cordiali saluti,<br><strong>${centro.business_name}</strong></p></div><div style="text-align:center;padding:20px"><p style="color:#64748b;font-size:12px">${centro.business_name} | ${centro.address} | ${centro.phone}</p></div></div></body></html>`;

    const subject = `Perizia Tecnica n. ${report.report_number} - ${centro.business_name}`;
    const pdfFilename = `Perizia_${report.report_number}.pdf`;

    // Check if Centro has SMTP configured
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

    // Fallback to Resend if SMTP not configured or failed
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

    // Update report sent status
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
