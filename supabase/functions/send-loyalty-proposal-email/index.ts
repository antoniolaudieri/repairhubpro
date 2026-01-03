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

    // Build email HTML - table-based layout for better email client compatibility
    const emailHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tessera Fedelta - ${centro.business_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #f59e0b; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">Tessera Fedelta</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">${centro.business_name}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px 25px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Ciao <strong>${customer_name || 'Cliente'}</strong>,
              </p>
              
              <p style="margin: 0 0 25px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Ti proponiamo la nostra <strong>Tessera Fedelta</strong> con vantaggi esclusivi per i tuoi dispositivi!
              </p>
              
              <!-- Benefits Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 8px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #92400e;">I tuoi vantaggi:</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #333333;">
                          &#10003; Diagnosi a soli <strong style="color: #16a34a;">EUR ${diagnosticFee}</strong> (invece di EUR 15)
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #333333;">
                          &#10003; <strong style="color: #16a34a;">${repairDiscount}% di sconto</strong> su ogni riparazione
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #333333;">
                          &#10003; Fino a <strong>${maxDevices} dispositivi</strong> coperti
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #333333;">
                          &#10003; Validita <strong>12 mesi</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 15px; color: #333333;">
                          &#10003; Priorita nelle prenotazioni
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Price Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Prezzo annuale</p>
                    <p style="margin: 10px 0; font-size: 42px; font-weight: bold; color: #1e293b;">EUR ${annualPrice}</p>
                    <p style="margin: 0; font-size: 14px; color: #64748b;">Abbonamento con rinnovo automatico</p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 25px 0;">
                    <a href="${session.url}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
                      ATTIVA ORA
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; text-align: center; font-size: 13px; color: #64748b;">
                Pagamento sicuro con carta di credito
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #333333;">${centro.business_name}</p>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #64748b;">Tel: ${centro.phone || 'N/A'}</p>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Email: ${centro.email || 'N/A'}</p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Se non hai richiesto questa email, puoi ignorarla.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

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
