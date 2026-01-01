import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpportunityEmailRequest {
  centro_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  opportunity_type: string;
  device_info?: string;
  days_overdue?: number;
  repair_cost?: number;
}

serve(async (req) => {
  console.log("send-opportunity-email: Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      centro_id, 
      customer_id, 
      customer_name, 
      customer_email,
      opportunity_type,
      device_info,
      days_overdue,
      repair_cost
    }: OpportunityEmailRequest = await req.json();
    
    console.log("send-opportunity-email: Processing for", customer_email, "type:", opportunity_type);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Centro details
    const { data: centro } = await supabase
      .from("centri_assistenza")
      .select("business_name, address, phone, email, logo_url")
      .eq("id", centro_id)
      .single();

    const centroName = centro?.business_name || "Centro Assistenza";
    const centroPhone = centro?.phone || "";
    const centroEmail = centro?.email || "";
    const centroAddress = centro?.address || "";
    const centroLogo = centro?.logo_url || "";

    // Generate email content based on opportunity type
    let subject = "";
    let headerTitle = "";
    let headerColor = "";
    let mainContent = "";
    let ctaText = "";
    let warningBlock = "";

    switch (opportunity_type) {
      case "expiring_devices":
        subject = `⚠️ Urgente: Il tuo dispositivo è pronto da ${days_overdue || 14}+ giorni`;
        headerTitle = "Dispositivo Pronto per il Ritiro";
        headerColor = "linear-gradient(135deg, #f97316 0%, #ea580c 100%)";
        mainContent = `
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Ti ricordiamo che il tuo dispositivo <strong>${device_info || 'riparato'}</strong> è pronto per il ritiro 
            presso il nostro centro da <strong>${days_overdue || 14} giorni</strong>.
          </p>
          ${repair_cost ? `
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 4px 0;">IMPORTO DA SALDARE</p>
            <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">€${repair_cost.toFixed(2)}</p>
          </div>
          ` : ''}
        `;
        warningBlock = `
          <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h4 style="color: #991b1b; margin: 0 0 12px 0; font-size: 16px;">⚠️ Avviso Importante</h4>
            <p style="color: #b91c1c; font-size: 14px; line-height: 1.6; margin: 0;">
              Come da contratto sottoscritto al momento del ritiro, i dispositivi non ritirati entro 
              <strong>30 giorni</strong> dalla data di completamento della riparazione verranno considerati 
              <strong>alienati</strong> e diventeranno di proprietà del centro assistenza.
            </p>
            <p style="color: #dc2626; font-size: 13px; margin: 12px 0 0 0; font-weight: 600;">
              Ti invitiamo a ritirare il tuo dispositivo il prima possibile per evitare la perdita dello stesso.
            </p>
          </div>
        `;
        ctaText = "📞 Contattaci per il Ritiro";
        break;

      case "expiring_loyalty":
        subject = "🎁 La tua Tessera Fedeltà sta per scadere!";
        headerTitle = "Rinnova la tua Tessera Fedeltà";
        headerColor = "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)";
        mainContent = `
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            La tua tessera fedeltà sta per scadere! Non perdere i vantaggi esclusivi riservati ai nostri clienti più fedeli.
          </p>
          <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #7c3aed; margin: 0 0 12px 0; font-size: 16px;">✨ I tuoi vantaggi</h3>
            <ul style="color: #6d28d9; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Sconti esclusivi su tutte le riparazioni</li>
              <li style="margin-bottom: 8px;">Priorità nelle prenotazioni</li>
              <li style="margin-bottom: 8px;">Promozioni riservate</li>
              <li>Assistenza prioritaria</li>
            </ul>
          </div>
        `;
        ctaText = "🎁 Rinnova la Tessera";
        break;

      case "inactive_high_value":
        subject = "💝 Ci manchi! Torna a trovarci";
        headerTitle = "È passato un po' di tempo...";
        headerColor = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)";
        mainContent = `
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            È da un po' che non ci vediamo e volevamo sapere come stai! Sei sempre uno dei nostri clienti più importanti e ci farebbe piacere rivederti.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #2563eb; margin: 0 0 12px 0; font-size: 16px;">🎯 Cosa possiamo fare per te?</h3>
            <p style="color: #1e40af; font-size: 14px; margin: 0;">
              Che si tratti di una riparazione, un check-up del dispositivo o semplicemente un consiglio, siamo qui per aiutarti!
            </p>
          </div>
        `;
        ctaText = "📱 Prenota un Appuntamento";
        break;

      case "high_churn_risk":
        subject = "💬 Come stai? Siamo qui per te";
        headerTitle = "Vogliamo assicurarci che tu sia soddisfatto";
        headerColor = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        mainContent = `
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Volevamo semplicemente assicurarci che tutto vada bene. La tua soddisfazione è la nostra priorità e siamo sempre disponibili per qualsiasi domanda o necessità.
          </p>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #d97706; margin: 0 0 12px 0; font-size: 16px;">📝 Il tuo feedback conta</h3>
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              Se c'è qualcosa che possiamo migliorare o se hai avuto qualche problema, faccelo sapere. Siamo sempre pronti ad ascoltarti.
            </p>
          </div>
        `;
        ctaText = "💬 Parlaci";
        break;

      default:
        subject = `Messaggio da ${centroName}`;
        headerTitle = "Un messaggio per te";
        headerColor = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
        mainContent = `
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Abbiamo un'opportunità speciale per te. Contattaci per saperne di più!
          </p>
        `;
        ctaText = "📞 Contattaci";
    }

    // Build header with logo
    const headerContent = centroLogo 
      ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom: 16px;"><img src="${centroLogo}" alt="${centroName}" style="max-height: 60px; max-width: 200px; border-radius: 8px;" /></td></tr><tr><td align="center"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${centroName}</h1><p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${headerTitle}</p></td></tr></table>`
      : `<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${centroName}</h1><p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${headerTitle}</p>`;

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
            <td style="background: ${headerColor}; padding: 32px; text-align: center;">
              ${headerContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">
                Gentile ${customer_name},
              </h2>
              
              ${mainContent}
              
              ${warningBlock}

              <div style="text-align: center; margin: 32px 0;">
                <a href="tel:${centroPhone}" style="display: inline-block; background: ${headerColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ${ctaText}
                </a>
              </div>

              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Puoi contattarci anche via:</p>
                <p style="margin: 0;">
                  ${centroPhone ? `<a href="tel:${centroPhone}" style="color: #2563eb; text-decoration: none; font-size: 14px;">📞 ${centroPhone}</a>` : ''}
                  ${centroPhone && centroEmail ? ' &nbsp;|&nbsp; ' : ''}
                  ${centroEmail ? `<a href="mailto:${centroEmail}" style="color: #2563eb; text-decoration: none; font-size: 14px;">✉️ ${centroEmail}</a>` : ''}
                </p>
              </div>
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
        to: customer_email,
        subject,
        html: emailHtml,
        customer_id,
        template_name: `opportunity_${opportunity_type}`,
        metadata: { opportunity_type, device_info, days_overdue },
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (emailResult.success) {
      console.log("send-opportunity-email: Email sent successfully to", customer_email);
      
      // Log to revenue_opportunities_log
      await supabase.from("revenue_opportunities_log").insert({
        centro_id,
        customer_id,
        opportunity_type,
        status: "email_sent",
        contacted_at: new Date().toISOString(),
      });
    } else {
      console.error("send-opportunity-email: Email send failed", emailResult.error);
    }

    return new Response(
      JSON.stringify({ 
        success: emailResult.success,
        method: emailResult.method,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("send-opportunity-email: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
