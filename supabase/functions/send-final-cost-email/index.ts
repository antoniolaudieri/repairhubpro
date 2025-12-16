import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinalCostEmailRequest {
  repair_id: string;
  centro_id: string;
}

serve(async (req) => {
  console.log("send-final-cost-email: Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { repair_id, centro_id }: FinalCostEmailRequest = await req.json();
    
    console.log("send-final-cost-email: Processing repair", repair_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch repair details with device and customer
    const { data: repair, error: repairError } = await supabase
      .from("repairs")
      .select(`
        id,
        final_cost,
        estimated_cost,
        diagnosis,
        repair_notes,
        acconto,
        device:devices (
          brand,
          model,
          device_type,
          reported_issue,
          customer:customers (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .eq("id", repair_id)
      .single();

    if (repairError || !repair) {
      console.error("send-final-cost-email: Repair not found", repairError);
      throw new Error("Repair not found");
    }

    const customer = (repair.device as any)?.customer;
    const device = repair.device as any;

    if (!customer?.email) {
      console.log("send-final-cost-email: Customer has no email");
      return new Response(
        JSON.stringify({ success: false, error: "Customer has no email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Centro details
    const { data: centro } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, logo_url, vat_number")
      .eq("id", centro_id)
      .single();

    const centroName = centro?.business_name || "LabLinkRiparo";
    const centroPhone = centro?.phone || "";
    const centroEmail = centro?.email || "";
    const centroAddress = centro?.address || "";
    const centroLogo = centro?.logo_url || "";

    // Generate signing session ID
    const sessionId = crypto.randomUUID();
    
    // Build the acceptance URL
    const origin = req.headers.get("origin") || "https://lablinkriparo.lovable.app";
    const acceptUrl = `${origin}/customer`;

    // Format device name
    const deviceName = [device?.brand, device?.model].filter(Boolean).join(" ") || device?.device_type || "Dispositivo";

    // Calculate balance due
    const acconto = repair.acconto || 0;
    const finalCost = repair.final_cost || 0;
    const balanceDue = finalCost - acconto;

    // Build header with logo
    const headerContent = centroLogo 
      ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom: 16px;"><img src="${centroLogo}" alt="${centroName}" style="max-height: 60px; max-width: 200px; border-radius: 8px;" /></td></tr><tr><td align="center"><h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${centroName}</h1><p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Costo Finale Riparazione</p></td></tr></table>`
      : `<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${centroName}</h1><p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Costo Finale Riparazione</p>`;

    const diagnosisBlock = repair.diagnosis 
      ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;"><h4 style="color:#166534;margin-top:0;font-size:14px;">Diagnosi</h4><p style="color:#166534;margin-bottom:0;font-size:14px;">${repair.diagnosis}</p></div>` 
      : '';
    
    const notesBlock = repair.repair_notes 
      ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;"><h4 style="color:#92400e;margin-top:0;font-size:14px;">Note Riparazione</h4><p style="color:#92400e;margin-bottom:0;font-size:14px;">${repair.repair_notes}</p></div>` 
      : '';

    const accontoBlock = acconto > 0 
      ? `<div style="background:#f0f9ff;border-radius:8px;padding:16px;margin-bottom:16px;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#64748b;font-size:14px;">Acconto versato:</span><span style="color:#0369a1;font-weight:600;">-€${acconto.toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;"><span style="color:#1e293b;font-weight:600;font-size:16px;">Saldo da pagare:</span><span style="color:#059669;font-weight:bold;font-size:18px;">€${balanceDue.toFixed(2)}</span></div></div>`
      : '';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; max-width: 600px;">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px;">
                Gentile ${customer.name},
              </h2>
              
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                La riparazione del tuo dispositivo è stata completata. Di seguito trovi il riepilogo del costo finale.
              </p>

              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 8px 0; font-size: 14px;">📱 Dispositivo</h3>
                <p style="color: #0c4a6e; font-size: 16px; font-weight: bold; margin: 0;">${deviceName}</p>
                <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">${device?.reported_issue || ''}</p>
              </div>

              ${diagnosisBlock}
              ${notesBlock}

              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 4px 0;">COSTO FINALE RIPARAZIONE</p>
                <p style="color: #ffffff; font-size: 36px; font-weight: bold; margin: 0;">€${finalCost.toFixed(2)}</p>
              </div>

              ${accontoBlock}

              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  ⚠️ <strong>Importante:</strong> Per procedere con il ritiro, accedi al tuo portale cliente e accetta il costo finale.
                </p>
              </div>

              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✅ Accedi e Accetta il Costo
                </a>
              </div>

              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                Per domande, contattaci al ${centroPhone || centroEmail}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                Questa email è stata inviata automaticamente da ${centroName}.
              </p>
              ${centroAddress ? `<p style="color: #a1a1aa; font-size: 11px; margin: 0 0 4px 0;">${centroAddress}</p>` : ''}
              ${centroPhone ? `<p style="color: #a1a1aa; font-size: 11px; margin: 0 0 8px 0;">Tel: ${centroPhone}</p>` : ''}
              <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} ${centroName} - Gestionale Riparazioni
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();

    // Send email via send-email-smtp
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        centro_id,
        to: customer.email,
        subject: `Costo Finale Riparazione ${deviceName} - €${finalCost.toFixed(2)}`,
        html: emailHtml,
        customer_id: customer.id,
        template_name: "final_cost_notification",
        metadata: { repair_id, final_cost: finalCost },
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      console.log("send-final-cost-email: Email sent successfully to", customer.email);
      
      // Create customer notification
      await supabase.from("customer_notifications").insert({
        customer_email: customer.email,
        title: "💰 Costo Finale Disponibile",
        message: `Riparazione ${deviceName}: €${finalCost.toFixed(2)}. Accedi per accettare e ritirare.`,
        type: "final_cost",
        data: { repair_id, final_cost: finalCost, accept_url: acceptUrl },
      });
    } else {
      console.error("send-final-cost-email: Email send failed", emailResult.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: emailResult.success 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("send-final-cost-email: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
