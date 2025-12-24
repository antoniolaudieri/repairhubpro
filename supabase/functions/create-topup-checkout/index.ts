import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { entity_type, entity_id, amount, user_email } = await req.json();
    console.log("[CREATE-TOPUP-CHECKOUT] Starting for entity:", entity_type, entity_id, "amount:", amount);

    if (!entity_type || !entity_id || !amount) {
      throw new Error("Missing required fields: entity_type, entity_id, amount");
    }

    if (amount < 50) {
      throw new Error("Minimum topup amount is €50");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get entity name for description
    const table = entity_type === "centro" ? "centri_assistenza" : "corners";
    const { data: entity } = await supabaseClient
      .from(table)
      .select("business_name")
      .eq("id", entity_id)
      .single();

    const entityName = entity?.business_name || entity_type;

    // Check if customer exists
    let customerId;
    if (user_email) {
      const customers = await stripe.customers.list({ email: user_email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Create a pending topup request
    const { data: topupRequest, error: insertError } = await supabaseClient
      .from("topup_requests")
      .insert({
        entity_type,
        entity_id,
        amount,
        payment_method: "stripe",
        status: "pending",
        notes: "Pagamento con carta via Stripe",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[CREATE-TOPUP-CHECKOUT] Error creating topup request:", insertError);
      throw new Error("Failed to create topup request");
    }

    console.log("[CREATE-TOPUP-CHECKOUT] Created pending topup request:", topupRequest.id);

    // Create Stripe checkout session with dynamic price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Ricarica Credito - ${entityName}`,
              description: `Ricarica credito piattaforma per ${entity_type === "centro" ? "Centro" : "Corner"}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/${entity_type === "centro" ? "centro" : "corner"}?topup=success`,
      cancel_url: `${req.headers.get("origin")}/${entity_type === "centro" ? "centro" : "corner"}?topup=cancelled`,
      metadata: {
        topup_request_id: topupRequest.id,
        entity_type,
        entity_id,
        amount: amount.toString(),
      },
    });

    // Update topup request with session ID
    await supabaseClient
      .from("topup_requests")
      .update({ 
        payment_reference: session.id,
        notes: `Stripe session: ${session.id}`,
      })
      .eq("id", topupRequest.id);

    console.log("[CREATE-TOPUP-CHECKOUT] Created checkout session:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      topup_request_id: topupRequest.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-TOPUP-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
