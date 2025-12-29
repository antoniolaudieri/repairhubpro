import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_id, customer_name, customer_email, corner_id } = await req.json();
    console.log("[SEND-CORNER-LOYALTY-INVITE] Starting for:", customer_email);

    if (!invitation_id || !customer_email || !corner_id) {
      throw new Error("Missing required parameters");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get corner info
    const { data: corner } = await supabaseClient
      .from("corners")
      .select("business_name, phone, email")
      .eq("id", corner_id)
      .single();

    // Get invitation with token
    const { data: invitation } = await supabaseClient
      .from("corner_loyalty_invitations")
      .select("invitation_token")
      .eq("id", invitation_id)
      .single();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Build checkout URL with invitation token
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://lablinkriparo.lovable.app";
    const checkoutUrl = `${baseUrl}/corner-loyalty-checkout?token=${invitation.invitation_token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "LabLink Riparo <onboarding@resend.dev>",
      to: [customer_email],
      subject: `${corner?.business_name || "Corner"} ti invita ad attivare la Tessera Fedeltà`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Tessera Fedeltà</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">LabLink Riparo</p>
            </div>
            
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">
                Ciao <strong>${customer_name}</strong>,
              </p>
              
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${corner?.business_name || "Il tuo Corner di fiducia"}</strong> ti invita ad attivare la 
                <strong>Tessera Fedeltà</strong> per accedere a vantaggi esclusivi!
              </p>
              
              <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin: 0 0 16px 0; color: #333;">✨ Cosa include:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #666; line-height: 1.8;">
                  <li><strong>App Android di Diagnostica</strong> - Scanner malware e monitoraggio salute dispositivo</li>
                  <li><strong>Sconti sulle riparazioni</strong> - Risparmia su ogni intervento</li>
                  <li><strong>Priorità</strong> - Code accelerate e assistenza dedicata</li>
                  <li><strong>Fino a 3 dispositivi</strong> - Proteggi tutta la famiglia</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 32px; font-weight: bold; color: #6366f1; margin: 0;">€40<span style="font-size: 16px; color: #666;">/anno</span></p>
              </div>
              
              <a href="${checkoutUrl}" 
                 style="display: block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                        color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; 
                        font-weight: bold; font-size: 18px; text-align: center; margin: 20px 0;">
                Attiva Ora la Tessera
              </a>
              
              <p style="color: #999; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                Questo link è valido per 30 giorni
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
              ${corner?.business_name || "Corner"} • ${corner?.phone || ""} • ${corner?.email || ""}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[SEND-CORNER-LOYALTY-INVITE] Email sent:", emailResponse);

    // Update invitation status
    await supabaseClient
      .from("corner_loyalty_invitations")
      .update({ 
        status: "sent",
        sent_at: new Date().toISOString()
      })
      .eq("id", invitation_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-CORNER-LOYALTY-INVITE] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
