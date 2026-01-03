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

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .benefit-card { background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .price-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .price { font-size: 36px; font-weight: bold; color: #1e293b; }
    .price-suffix { font-size: 18px; color: #64748b; }
    .cta-button { display: block; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px; margin: 25px auto; max-width: 300px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
    .highlight { color: #16a34a; font-weight: bold; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎁 Tessera Fedeltà per Te!</h1>
    </div>
    
    <div class="content">
      <p>Ciao <strong>${customer_name || 'Cliente'}</strong>,</p>
      
      <p>${centro.business_name} ti propone la <strong>Tessera Fedeltà</strong> con vantaggi esclusivi per la cura dei tuoi dispositivi!</p>
      
      <div class="benefit-card">
        <h3 style="margin: 0 0 15px 0; color: #92400e;">✨ I tuoi vantaggi esclusivi:</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li><span class="highlight">Diagnosi a soli €${diagnosticFee}</span> (invece di €15) per fino a ${maxDevices} dispositivi</li>
          <li><span class="highlight">${repairDiscount}% di sconto</span> su ogni riparazione</li>
          <li>Validità <strong>12 mesi</strong> dalla data di attivazione</li>
          <li>Priorità nelle prenotazioni</li>
          <li>Supporto dedicato</li>
        </ul>
      </div>
      
      <div class="price-box">
        <span class="price">€${annualPrice}</span>
        <span class="price-suffix">/anno</span>
        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Abbonamento annuale con rinnovo automatico</p>
      </div>
      
      <a href="${session.url}" class="cta-button">
        💳 Attiva la tua Tessera
      </a>
      
      <p style="text-align: center; font-size: 14px; color: #64748b;">
        Pagamento sicuro con carta tramite Stripe
      </p>
    </div>
    
    <div class="footer">
      <p><strong>${centro.business_name}</strong></p>
      <p>📞 ${centro.phone} | ✉️ ${centro.email}</p>
      <p style="font-size: 12px; margin-top: 15px;">
        Se non hai richiesto questa email, puoi ignorarla.
      </p>
    </div>
  </div>
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
