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
