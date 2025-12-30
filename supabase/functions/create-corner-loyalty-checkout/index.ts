import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Corner loyalty pricing
const CORNER_LOYALTY_PRICE = 30; // €30 for customer
const CORNER_COMMISSION = 10; // €10 for corner
const PLATFORM_COMMISSION = 20; // €20 remaining (Centro gets this minus platform fee)

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_token, centro_id } = await req.json();
    console.log("[CREATE-CORNER-LOYALTY-CHECKOUT] Starting for token:", invitation_token);

    if (!invitation_token || !centro_id) {
      throw new Error("invitation_token and centro_id are required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get invitation by token
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("corner_loyalty_invitations")
      .select("*, corner:corners(id, business_name)")
      .eq("invitation_token", invitation_token)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invito non trovato o scaduto");
    }

    if (invitation.status === "paid") {
      throw new Error("Questa tessera è già stata attivata");
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error("Questo invito è scaduto");
    }

    // Get centro info
    const { data: centro } = await supabaseClient
      .from("centri_assistenza")
      .select("business_name")
      .eq("id", centro_id)
      .single();

    // Check if customer exists, create if not
    let customerId: string;
    const { data: existingCustomer } = await supabaseClient
      .from("customers")
      .select("id")
      .eq("email", invitation.customer_email)
      .eq("centro_id", centro_id)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Check for existing active card
      const { data: existingCard } = await supabaseClient
        .from("loyalty_cards")
        .select("id")
        .eq("customer_id", customerId)
        .eq("centro_id", centro_id)
        .eq("status", "active")
        .maybeSingle();

      if (existingCard) {
        throw new Error("Il cliente ha già una tessera attiva per questo centro");
      }
    } else {
      // Create customer
      const { data: newCustomer, error: customerError } = await supabaseClient
        .from("customers")
        .insert({
          name: invitation.customer_name,
          email: invitation.customer_email,
          phone: invitation.customer_phone || "",
          centro_id: centro_id
        })
        .select()
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    // Delete any pending cards
    await supabaseClient
      .from("loyalty_cards")
      .delete()
      .eq("customer_id", customerId)
      .eq("centro_id", centro_id)
      .eq("status", "pending_payment");

    // Create pending loyalty card with corner referral
    const { data: loyaltyCard, error: cardError } = await supabaseClient
      .from("loyalty_cards")
      .insert({
        customer_id: customerId,
        centro_id: centro_id,
        status: "pending_payment",
        payment_method: "stripe",
        amount_paid: CORNER_LOYALTY_PRICE,
        platform_commission: PLATFORM_COMMISSION * 0.05, // 5% of €30 = €1.50
        centro_revenue: PLATFORM_COMMISSION * 0.95, // €28.50
        corner_commission: CORNER_COMMISSION,
        referred_by_corner_id: invitation.corner_id,
        max_devices: 3,
      })
      .select()
      .single();

    if (cardError) throw cardError;

    console.log("[CREATE-CORNER-LOYALTY-CHECKOUT] Created pending card:", loyaltyCard.id);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: invitation.customer_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Tessera Fedeltà - ${centro?.business_name || "Centro"}`,
              description: `Validità 12 mesi - Fino a 3 dispositivi - Proposta da ${invitation.corner?.business_name || "Corner"}`,
            },
            unit_amount: CORNER_LOYALTY_PRICE * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/corner-loyalty-success?card_id=${loyaltyCard.id}`,
      cancel_url: `${req.headers.get("origin")}/corner-loyalty-checkout?token=${invitation_token}&cancelled=true`,
      metadata: {
        type: "corner_loyalty_card",
        loyalty_card_id: loyaltyCard.id,
        customer_id: customerId,
        centro_id: centro_id,
        corner_id: invitation.corner_id,
        invitation_id: invitation.id,
        corner_commission: CORNER_COMMISSION.toString(),
      },
    });

    // Update invitation status
    await supabaseClient
      .from("corner_loyalty_invitations")
      .update({ 
        status: "clicked",
        clicked_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    // Update loyalty card with session ID
    await supabaseClient
      .from("loyalty_cards")
      .update({ stripe_session_id: session.id })
      .eq("id", loyaltyCard.id);

    console.log("[CREATE-CORNER-LOYALTY-CHECKOUT] Created checkout session:", session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      loyalty_card_id: loyaltyCard.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-CORNER-LOYALTY-CHECKOUT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
