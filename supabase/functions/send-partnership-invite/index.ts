import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  inviteId: string;
  fromType: "centro" | "corner";
  fromId: string;
  toType: "centro" | "corner";
  toId: string;
  message: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { inviteId, fromType, fromId, toType, toId, message }: InviteRequest = await req.json();

    console.log(`Processing partnership invite: ${inviteId}`);
    console.log(`From: ${fromType} ${fromId} -> To: ${toType} ${toId}`);

    // Fetch sender info
    let senderName = "";
    let senderEmail = "";
    let senderPhone = "";
    let senderAddress = "";
    let senderLogo: string | null = null;

    if (fromType === "centro") {
      const { data: centro, error } = await supabase
        .from("centri_assistenza")
        .select("business_name, email, phone, address, logo_url")
        .eq("id", fromId)
        .single();

      if (error) throw new Error(`Centro not found: ${error.message}`);
      senderName = centro.business_name;
      senderEmail = centro.email;
      senderPhone = centro.phone;
      senderAddress = centro.address;
      senderLogo = centro.logo_url;
    } else {
      const { data: corner, error } = await supabase
        .from("corners")
        .select("business_name, email, phone, address")
        .eq("id", fromId)
        .single();

      if (error) throw new Error(`Corner not found: ${error.message}`);
      senderName = corner.business_name;
      senderEmail = corner.email;
      senderPhone = corner.phone;
      senderAddress = corner.address;
    }

    // Fetch recipient info
    let recipientName = "";
    let recipientEmail = "";

    if (toType === "centro") {
      const { data: centro, error } = await supabase
        .from("centri_assistenza")
        .select("business_name, email")
        .eq("id", toId)
        .single();

      if (error) throw new Error(`Recipient Centro not found: ${error.message}`);
      recipientName = centro.business_name;
      recipientEmail = centro.email;
    } else {
      const { data: corner, error } = await supabase
        .from("corners")
        .select("business_name, email")
        .eq("id", toId)
        .single();

      if (error) throw new Error(`Recipient Corner not found: ${error.message}`);
      recipientName = corner.business_name;
      recipientEmail = corner.email;
    }

    const senderTypeLabel = fromType === "centro" ? "Centro Assistenza" : "Corner";
    const baseUrl = "https://mivvpthovnkynigfwmjm.lovable.app";
    const acceptUrl = `${baseUrl}/corner/partnership?action=accept&inviteId=${inviteId}`;
    const declineUrl = `${baseUrl}/corner/partnership?action=decline&inviteId=${inviteId}`;

    // Generate professional HTML email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Richiesta di Partnership</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 40px 30px; text-align: center;">
              ${senderLogo ? `<img src="${senderLogo}" alt="Logo" style="width: 80px; height: 80px; border-radius: 16px; object-fit: cover; margin-bottom: 16px; border: 3px solid rgba(255,255,255,0.3);">` : ''}
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 700;">Richiesta di Partnership</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Nuova opportunità di collaborazione</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="font-size: 18px; color: #1f2937; margin: 0 0 24px;">
                Gentile <strong>${recipientName}</strong>,
              </p>
              
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${senderTypeLabel}
                </p>
                <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e40af;">
                  ${senderName}
                </p>
                <p style="margin: 8px 0 0; font-size: 14px; color: #4b5563;">
                  📍 ${senderAddress}<br>
                  📞 ${senderPhone}<br>
                  ✉️ ${senderEmail}
                </p>
              </div>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.7; margin: 0 0 24px;">
                desidera avviare una collaborazione con te sulla piattaforma LabLinkRiparo.
              </p>
              
              ${message ? `
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
                  Messaggio personale
                </p>
                <p style="margin: 0; font-size: 15px; color: #374151; font-style: italic; line-height: 1.6;">
                  "${message}"
                </p>
              </div>
              ` : ''}
              
              <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 32px;">
                Accettando questa partnership, potrete:<br>
                ✓ Scambiare lavori e referral<br>
                ✓ Guadagnare commissioni sulle riparazioni inviate<br>
                ✓ Espandere la vostra rete di collaboratori
              </p>
              
              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      ✓ Accetta Partnership
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${declineUrl}" style="display: inline-block; background-color: #f3f4f6; color: #6b7280; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 500;">
                      Rifiuta
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                Questa email è stata inviata tramite <strong>LabLinkRiparo</strong>.<br>
                Puoi anche gestire questa richiesta accedendo alla tua dashboard.
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

    // Send email using send-email-smtp function (with Centro SMTP support if sender is centro)
    const centroId = fromType === "centro" ? fromId : null;
    
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        centro_id: centroId,
        to: recipientEmail,
        subject: `🤝 Richiesta di Partnership da ${senderName}`,
        html: htmlContent,
        from_name_override: senderName,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        recipientEmail 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-partnership-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
