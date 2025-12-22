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

  try {
    const { customer_id, centro_id, customer_email, tracking_id } = await req.json();
    console.log("[CREATE-LOYALTY-CHECKOUT] Starting for customer:", customer_id, "centro:", centro_id, "tracking:", tracking_id);

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
    const { data: existingActiveCard } = await supabaseClient
      .from("loyalty_cards")
      .select("id, status")
      .eq("customer_id", customer_id)
      .eq("centro_id", centro_id)
      .eq("status", "active")
      .maybeSingle();

    if (existingActiveCard) {
      throw new Error("Customer already has an active loyalty card for this centro");
    }

    // Delete any existing pending_payment cards for this customer/centro
    await supabaseClient
      .from("loyalty_cards")
      .delete()
      .eq("customer_id", customer_id)
      .eq("centro_id", centro_id)
      .eq("status", "pending_payment");

    // Get centro info and loyalty program settings
    const { data: centro } = await supabaseClient
      .from("centri_assistenza")
      .select("business_name")
      .eq("id", centro_id)
      .single();

    // Get Centro's custom loyalty program settings
    const { data: loyaltySettings } = await supabaseClient
      .from("loyalty_program_settings")
      .select("*")
      .eq("centro_id", centro_id)
      .eq("is_active", true)
      .maybeSingle();

    // Use custom settings or defaults
    const annualPrice = loyaltySettings?.annual_price ?? 30;
    const maxDevices = loyaltySettings?.max_devices ?? 3;
    const validityMonths = loyaltySettings?.validity_months ?? 12;
    const platformCommissionRate = 0.05; // 5%
    const platformCommission = annualPrice * platformCommissionRate;
    const centroRevenue = annualPrice - platformCommission;

    console.log("[CREATE-LOYALTY-CHECKOUT] Using price:", annualPrice, "€");

    // Create pending loyalty card record with correct amounts
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
      console.error("[CREATE-LOYALTY-CHECKOUT] Error creating loyalty card:", insertError);
      throw new Error("Failed to create loyalty card record");
    }

    console.log("[CREATE-LOYALTY-CHECKOUT] Created pending card:", loyaltyCard.id);

    // Create Stripe checkout session with dynamic price
    const session = await stripe.checkout.sessions.create({
      customer_email: customer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tessera Fedeltà - ${centro?.business_name || "Centro"}`,
              description: `Validità ${validityMonths} mesi - Fino a ${maxDevices} dispositivi`,
            },
            unit_amount: Math.round(annualPrice * 100), // Convert to cents
          },
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
        annual_price: annualPrice.toString(),
        tracking_id: tracking_id || "",
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
      loyalty_card_id: loyaltyCard.id,
      annual_price: annualPrice,
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
