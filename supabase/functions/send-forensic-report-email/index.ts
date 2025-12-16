import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) throw new Error("Report not found");

    const { data: centro, error: centroError } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, vat_number")
      .eq("id", centroId)
      .single();

    if (centroError || !centro) throw new Error("Centro not found");

    const purposeLabels: Record<string, string> = {
      avvocato: "Avvocato",
      polizia_postale: "Polizia Postale",
      assicurazione: "Assicurazione",
      altro: "Altro",
    };

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f5"><div style="max-width:600px;margin:0 auto;padding:20px"><div style="background:linear-gradient(135deg,#1e293b,#334155);padding:30px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">📋 Perizia Tecnica Forense</h1><p style="color:#94a3b8;margin:10px 0 0 0">N. ${report.report_number}</p></div><div style="background:#fff;padding:30px;border-radius:0 0 12px 12px"><p style="color:#374151;font-size:16px">Gentile <strong>${customerName}</strong>,</p><p style="color:#374151;font-size:14px">In allegato alla presente troverà la perizia tecnica forense relativa al dispositivo da Lei consegnato.</p><div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0"><h3 style="color:#1e293b;margin:0 0 15px 0">Riepilogo</h3><p style="margin:5px 0;font-size:14px"><strong>N. Perizia:</strong> ${report.report_number}</p><p style="margin:5px 0;font-size:14px"><strong>Dispositivo:</strong> ${report.device_brand || ""} ${report.device_model || ""}</p><p style="margin:5px 0;font-size:14px"><strong>Destinatario:</strong> ${purposeLabels[report.purpose] || report.purpose}</p></div><p style="color:#374151;font-size:14px">Per ricevere il PDF completo, contatti il laboratorio.</p><p style="color:#374151;font-size:14px;margin-top:20px">Cordiali saluti,<br><strong>${centro.business_name}</strong></p></div><div style="text-align:center;padding:20px"><p style="color:#64748b;font-size:12px">${centro.business_name} | ${centro.address} | ${centro.phone}</p></div></div></body></html>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "LabLinkRiparo <onboarding@resend.dev>",
      to: [customerEmail],
      subject: `Perizia Tecnica n. ${report.report_number} - ${centro.business_name}`,
      html: emailHtml,
    });

    console.log("Email sent successfully");
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