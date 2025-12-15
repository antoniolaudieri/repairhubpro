import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOYALTY_PRICE_ID = "price_1Sebo2ICmQjzXUDdd5R6M8b6";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, centro_id, customer_email } = await req.json();
    console.log("[CREATE-LOYALTY-CHECKOUT] Starting for customer:", customer_id, "centro:", centro_id);

    if (!customer_id || !centro_id) {
      throw new Error("customer_id and centro_id are required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if customer already has an active loyalty card for this centro
    const { data: existingCard } = await supabaseClient
      .from("loyalty_cards")
      .select("id, status")
      .eq("customer_id", customer_id)
      .eq("centro_id", centro_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingCard) {
      throw new Error("Customer already has an active loyalty card for this centro");
    }

    // Get centro info for metadata
    const { data: centro } = await supabaseClient
      .from("centri_assistenza")
      .select("business_name")
      .eq("id", centro_id)
      .single();

    // Create pending loyalty card record
    const { data: loyaltyCard, error: insertError } = await supabaseClient
      .from("loyalty_cards")
      .insert({
        customer_id,
        centro_id,
        status: "pending_payment",
        payment_method: "stripe",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[CREATE-LOYALTY-CHECKOUT] Error creating loyalty card:", insertError);
      throw new Error("Failed to create loyalty card record");
    }

    console.log("[CREATE-LOYALTY-CHECKOUT] Created pending card:", loyaltyCard.id);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: customer_email || undefined,
      line_items: [
        {
          price: LOYALTY_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/loyalty-success?card_id=${loyaltyCard.id}`,
      cancel_url: `${req.headers.get("origin")}/loyalty-cancelled`,
      metadata: {
        type: "loyalty_card",
        loyalty_card_id: loyaltyCard.id,
        customer_id,
        centro_id,
        centro_name: centro?.business_name || "Centro",
      },
    });

    // Update loyalty card with session ID
    await supabaseClient
      .from("loyalty_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", loyaltyCard.id);

    console.log("[CREATE-LOYALTY-CHECKOUT] Created checkout session:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      loyalty_card_id: loyaltyCard.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-LOYALTY-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
