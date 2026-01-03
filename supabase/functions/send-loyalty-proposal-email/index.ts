import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, centro_id, customer_email, customer_name } = await req.json();
    console.log("[SEND-LOYALTY-PROPOSAL] Starting for customer:", customer_id, "centro:", centro_id);

    if (!customer_id || !centro_id || !customer_email) {
      throw new Error("customer_id, centro_id and customer_email are required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if customer already has an active loyalty card
    const { data: existingCard } = await supabaseClient
      .from("loyalty_cards")
      .select("id")
      .eq("customer_id", customer_id)
      .eq("centro_id", centro_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingCard) {
      throw new Error("Il cliente ha già una tessera fedeltà attiva");
    }

    // Delete any existing pending_payment cards
    await supabaseClient
      .from("loyalty_cards")
      .delete()
      .eq("customer_id", customer_id)
      .eq("centro_id", centro_id)
      .eq("status", "pending_payment");

    // Get centro info
    const { data: centro } = await supabaseClient
      .from("centri_assistenza")
      .select("business_name, email, phone")
      .eq("id", centro_id)
      .single();

    if (!centro) {
      throw new Error("Centro non trovato");
    }

    // Get Centro's loyalty program settings
    const { data: loyaltySettings } = await supabaseClient
      .from("loyalty_program_settings")
      .select("*")
      .eq("centro_id", centro_id)
      .eq("is_active", true)
      .maybeSingle();

    // Use custom settings or defaults
    const annualPrice = loyaltySettings?.annual_price ?? 30;
    const maxDevices = loyaltySettings?.max_devices ?? 3;
    const repairDiscount = loyaltySettings?.repair_discount_percent ?? 10;
    const diagnosticFee = loyaltySettings?.diagnostic_fee ?? 10;
    const platformCommissionRate = 0.05;
    const platformCommission = annualPrice * platformCommissionRate;
    const centroRevenue = annualPrice - platformCommission;

    console.log("[SEND-LOYALTY-PROPOSAL] Using settings:", { annualPrice, maxDevices, repairDiscount, diagnosticFee });

    // Create pending loyalty card record
    const { data: loyaltyCard, error: insertError } = await supabaseClient
      .from("loyalty_cards")
      .insert({
        customer_id,
        centro_id,
        status: "pending_payment",
        payment_method: "stripe",
        amount_paid: annualPrice,
        platform_commission: platformCommission,
        centro_revenue: centroRevenue,
        max_devices: maxDevices,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[SEND-LOYALTY-PROPOSAL] Error creating card:", insertError);
      throw new Error("Errore nella creazione della tessera");
    }

    // Build success/cancel URLs
    const baseUrl = supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://', 'https://');
    const successUrl = `${baseUrl}/loyalty-success?card_id=${loyaltyCard.id}`;
    const cancelUrl = `${baseUrl}/loyalty-cancelled`;

    // Create Stripe checkout session with subscription
    const session = await stripe.checkout.sessions.create({
      customer_email: customer_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tessera Fedeltà - ${centro.business_name}`,
              description: `Abbonamento annuale - ${repairDiscount}% sconto riparazioni - Fino a ${maxDevices} dispositivi`,
            },
            unit_amount: Math.round(annualPrice * 100),
            recurring: {
              interval: "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: "loyalty_card_subscription",
        loyalty_card_id: loyaltyCard.id,
        customer_id,
        centro_id,
        centro_name: centro.business_name,
        annual_price: annualPrice.toString(),
      },
      subscription_data: {
        metadata: {
          type: "loyalty_card",
          loyalty_card_id: loyaltyCard.id,
          centro_id,
        },
      },
    });

    // Update loyalty card with session ID
    await supabaseClient
      .from("loyalty_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", loyaltyCard.id);

    console.log("[SEND-LOYALTY-PROPOSAL] Created checkout session:", session.id);

    // Build email HTML - using same professional template style as marketing emails
    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; max-width: 600px;">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${centro.business_name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Proposta Tessera Fedeltà</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px;">Ciao ${customer_name || 'Cliente'}!</h2>
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Ti proponiamo la nostra <strong>Tessera Fedeltà</strong> con vantaggi esclusivi per i tuoi dispositivi. 
                Con un piccolo investimento annuale, risparmi su ogni riparazione!
              </p>

              <!-- LOYALTY CARD PROMOTION BOX -->
              <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 24px; border-radius: 12px; margin: 0 0 24px 0;">
                <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #78350f;">🎉 I tuoi vantaggi esclusivi</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                      ✓ <strong>Diagnosi a €${diagnosticFee}</strong> invece di €15
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                      ✓ <strong>${repairDiscount}% di sconto</strong> su tutte le riparazioni
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                      ✓ Fino a <strong>${maxDevices} dispositivi</strong> coperti
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                      ✓ Validità <strong>12 mesi</strong> con rinnovo automatico
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #78350f; font-size: 15px;">
                      ✓ <strong>Priorità</strong> nelle prenotazioni
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- PRICE BOX -->
              <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="color: #0369a1; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Prezzo annuale</p>
                <p style="color: #0c4a6e; margin: 0 0 8px 0; font-size: 48px; font-weight: 700;">€${annualPrice}</p>
                <p style="color: #0369a1; margin: 0; font-size: 13px;">Pagamento sicuro con carta</p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${session.url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      💳 Attiva Ora - €${annualPrice}/anno
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #71717a; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
                Clicca il pulsante per procedere al pagamento sicuro.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #18181b; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${centro.business_name}</p>
              <p style="color: #71717a; margin: 0 0 4px 0; font-size: 13px;">📞 ${centro.phone || 'N/A'}</p>
              <p style="color: #71717a; margin: 0; font-size: 13px;">✉️ ${centro.email || 'N/A'}</p>
            </td>
          </tr>
        </table>
        <p style="color: #a1a1aa; font-size: 11px; margin: 16px 0 0 0; text-align: center;">
          Se non hai richiesto questa email, puoi ignorarla.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email using send-email-smtp function (uses Centro's SMTP settings)
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        centro_id,
        to: customer_email,
        subject: `🎁 La tua Tessera Fedeltà ti aspetta - ${centro.business_name}`,
        html: emailHtml,
        customer_id,
        template_name: "loyalty_proposal",
        metadata: {
          loyalty_card_id: loyaltyCard.id,
          stripe_session_id: session.id,
          payment_url: session.url,
          annual_price: annualPrice,
        },
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("[SEND-LOYALTY-PROPOSAL] Email result:", emailResult);

    if (!emailResponse.ok || emailResult.error) {
      console.error("[SEND-LOYALTY-PROPOSAL] Email error:", emailResult);
      throw new Error(emailResult.error || "Errore nell'invio dell'email");
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Email inviata a ${customer_email}`,
      loyalty_card_id: loyaltyCard.id,
      payment_url: session.url,
      email_method: emailResult.method,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-LOYALTY-PROPOSAL] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
