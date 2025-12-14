import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuoteEmailRequest {
  quote_id: string;
  repair_request_id: string;
  centro_id: string;
}

serve(async (req) => {
  console.log("send-quote-email: Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quote_id, repair_request_id, centro_id }: QuoteEmailRequest = await req.json();
    
    console.log("send-quote-email: Processing quote", quote_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch quote details
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select(`
        id,
        total_cost,
        parts_cost,
        labor_cost,
        device_type,
        device_brand,
        device_model,
        issue_description,
        items,
        valid_until,
        customer_id
      `)
      .eq("id", quote_id)
      .single();

    if (quoteError || !quote) {
      console.error("send-quote-email: Quote not found", quoteError);
      throw new Error("Quote not found");
    }

    // Fetch customer details
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("id", quote.customer_id)
      .single();

    if (!customer?.email) {
      console.log("send-quote-email: Customer has no email");
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
    
    // Build the signing URL
    const origin = req.headers.get("origin") || "https://lablinkriparo.lovable.app";
    const signUrl = `${origin}/firma-remota/${sessionId}?type=quote&quote_id=${quote_id}&repair_request_id=${repair_request_id}&total=${quote.total_cost}`;

    // Format device name
    const deviceName = [quote.device_brand, quote.device_model].filter(Boolean).join(" ") || quote.device_type;

    // Format items list
    const itemsArray = Array.isArray(quote.items) ? quote.items : [];
    const itemsList = itemsArray.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">€${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">€${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    // Format valid until date
    const validUntilFormatted = quote.valid_until 
      ? new Date(quote.valid_until).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : "30 giorni dalla ricezione";

    // Build header with logo
    const headerContent = centroLogo 
      ? `<table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <img src="${centroLogo}" alt="${centroName}" style="max-height: 60px; max-width: 200px; border-radius: 8px;" />
            </td>
          </tr>
          <tr>
            <td align="center">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${centroName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Preventivo di Riparazione</p>
            </td>
          </tr>
        </table>`
      : `<h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${centroName}</h1>
         <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Preventivo di Riparazione</p>`;

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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              ${headerContent}
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px;">
                Gentile ${customer.name},
              </h2>
              
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Abbiamo preparato il preventivo per la riparazione del tuo dispositivo. 
                Di seguito trovi tutti i dettagli.
              </p>

              <!-- Device Info -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 8px 0; font-size: 14px;">📱 Dispositivo</h3>
                <p style="color: #0c4a6e; font-size: 16px; font-weight: bold; margin: 0;">${deviceName}</p>
                <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">${quote.issue_description}</p>
              </div>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Descrizione</th>
                    <th style="padding: 12px; text-align: center; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Qtà</th>
                    <th style="padding: 12px; text-align: right; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Prezzo</th>
                    <th style="padding: 12px; text-align: right; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>

              <!-- Total -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 4px 0;">TOTALE DA PAGARE</p>
                <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">€${quote.total_cost.toFixed(2)}</p>
              </div>

              <!-- Validity -->
              <p style="color: #71717a; font-size: 13px; margin: 0 0 24px 0; padding: 12px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                ⏰ <strong>Validità preventivo:</strong> ${validUntilFormatted}
              </p>

              <!-- Sign CTA -->
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="color: #52525b; font-size: 14px; margin: 0 0 16px 0;">
                  Per procedere con la riparazione, conferma e firma il preventivo:
                </p>
                <a href="${signUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✍️ Firma il Preventivo
                </a>
              </div>

              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                Se hai domande, contattaci al ${centroPhone || centroEmail}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
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
        subject: `Preventivo Riparazione ${deviceName} - €${quote.total_cost.toFixed(2)}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      console.log("send-quote-email: Email sent successfully to", customer.email);
      
      // Create customer notification
      await supabase.from("customer_notifications").insert({
        customer_email: customer.email,
        title: "📋 Nuovo Preventivo Disponibile",
        message: `Preventivo per ${deviceName}: €${quote.total_cost.toFixed(2)}. Clicca per firmare e confermare.`,
        type: "quote",
        data: { quote_id, repair_request_id, sign_url: signUrl },
      });
    } else {
      console.error("send-quote-email: Email send failed", emailResult.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        session_id: sessionId,
        sign_url: signUrl,
        email_sent: emailResult.success 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("send-quote-email: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
