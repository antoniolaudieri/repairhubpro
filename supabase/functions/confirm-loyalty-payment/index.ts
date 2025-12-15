import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    let event;
    const webhookSecret = Deno.env.get("STRIPE_LOYALTY_WEBHOOK_SECRET");
    
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log("[CONFIRM-LOYALTY] Event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      if (session.metadata?.type === "loyalty_card" && session.metadata?.loyalty_card_id) {
        const loyaltyCardId = session.metadata.loyalty_card_id;
        const centroId = session.metadata.centro_id;
        
        console.log("[CONFIRM-LOYALTY] Activating loyalty card:", loyaltyCardId);

        // Activate the loyalty card
        const { error: updateError } = await supabaseClient
          .from("loyalty_cards")
          .update({
            status: "active",
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq("id", loyaltyCardId);

        if (updateError) {
          console.error("[CONFIRM-LOYALTY] Error activating card:", updateError);
          throw updateError;
        }

        // Deduct 5% platform commission from Centro's credit balance
        const platformCommission = 1.50; // 5% of €30
        
        const { data: centro } = await supabaseClient
          .from("centri_assistenza")
          .select("credit_balance, credit_warning_threshold")
          .eq("id", centroId)
          .single();

        if (centro) {
          const newBalance = (centro.credit_balance || 0) - platformCommission;
          
          await supabaseClient
            .from("centri_assistenza")
            .update({
              credit_balance: newBalance,
              last_credit_update: new Date().toISOString(),
              payment_status: newBalance <= 0 ? "suspended" : 
                             newBalance < (centro.credit_warning_threshold || 50) ? "warning" : "good_standing"
            })
            .eq("id", centroId);

          // Record credit transaction
          await supabaseClient
            .from("credit_transactions")
            .insert({
              entity_type: "centro",
              entity_id: centroId,
              transaction_type: "loyalty_commission",
              amount: -platformCommission,
              balance_after: newBalance,
              description: "Commissione 5% tessera fedeltà #" + loyaltyCardId.substring(0, 8),
            });
        }

        // Send welcome email to customer
        try {
          // Get loyalty card details
          const { data: loyaltyCard } = await supabaseClient
            .from("loyalty_cards")
            .select("card_number, expires_at, max_devices, customer_id")
            .eq("id", loyaltyCardId)
            .single();

          // Get customer info
          const { data: customer } = await supabaseClient
            .from("customers")
            .select("name, email")
            .eq("id", loyaltyCard?.customer_id)
            .single();

          // Get centro info
          const { data: centroInfo } = await supabaseClient
            .from("centri_assistenza")
            .select("business_name, phone, email, logo_url")
            .eq("id", centroId)
            .single();

          if (customer?.email && loyaltyCard) {
            const expiryDate = new Date(loyaltyCard.expires_at).toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  ${centroInfo?.logo_url ? `<img src="${centroInfo.logo_url}" alt="${centroInfo?.business_name}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
                  <h1 style="color: #2563eb; margin: 0;">Benvenuto nel Club Fedeltà!</h1>
                </div>
                
                <p>Gentile <strong>${customer.name}</strong>,</p>
                
                <p>Grazie per aver attivato la <strong>Tessera Fedeltà</strong> di <strong>${centroInfo?.business_name || 'LabLinkRiparo'}</strong>! 🎉</p>
                
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0;">
                  <h2 style="margin: 0 0 15px 0; font-size: 18px;">I Tuoi Vantaggi Esclusivi:</h2>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 10px;"><strong>Diagnosi Scontata:</strong> Solo €10 invece di €15 (risparmio di €5)</li>
                    <li style="margin-bottom: 10px;"><strong>10% di Sconto</strong> su tutte le riparazioni</li>
                    <li style="margin-bottom: 10px;"><strong>Fino a ${loyaltyCard.max_devices || 3} dispositivi</strong> coperti per un anno</li>
                  </ul>
                </div>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Numero Tessera:</strong> ${loyaltyCard.card_number || 'N/A'}</p>
                  <p style="margin: 10px 0 0 0;"><strong>Valida fino al:</strong> ${expiryDate}</p>
                </div>
                
                <p>I vantaggi verranno applicati <strong>automaticamente</strong> ad ogni riparazione presso ${centroInfo?.business_name}.</p>
                
                <p>Puoi visualizzare la tua tessera digitale accedendo alla tua <a href="https://lablinkriparo.it/customer-dashboard" style="color: #2563eb;">Dashboard Cliente</a>.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #6b7280;">
                  Per qualsiasi domanda, contattaci:<br>
                  📞 ${centroInfo?.phone || ''}<br>
                  ✉️ ${centroInfo?.email || ''}
                </p>
                
                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
                  Questa email è stata inviata da LabLinkRiparo per conto di ${centroInfo?.business_name}.
                </p>
              </body>
              </html>
            `.replace(/\n\s*/g, '').replace(/>\s+</g, '><').trim();

            // Send email via send-email-smtp function
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const response = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                centro_id: centroId,
                to: customer.email,
                subject: `🎉 Benvenuto nel Club Fedeltà di ${centroInfo?.business_name || 'LabLinkRiparo'}!`,
                html: emailHtml,
              }),
            });

            const emailResult = await response.json();
            console.log("[CONFIRM-LOYALTY] Welcome email sent:", emailResult);
          }
        } catch (emailError) {
          console.error("[CONFIRM-LOYALTY] Error sending welcome email:", emailError);
          // Don't fail the whole process if email fails
        }

        console.log("[CONFIRM-LOYALTY] Card activated successfully");
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CONFIRM-LOYALTY] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
