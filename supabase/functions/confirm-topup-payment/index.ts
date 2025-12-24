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
    const { session_id } = await req.json();
    console.log("[CONFIRM-TOPUP-PAYMENT] Confirming session:", session_id);

    if (!session_id) {
      throw new Error("Missing session_id");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("[CONFIRM-TOPUP-PAYMENT] Session status:", session.payment_status);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Payment not completed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const topupRequestId = session.metadata?.topup_request_id;
    const entityType = session.metadata?.entity_type;
    const entityId = session.metadata?.entity_id;
    const amount = parseFloat(session.metadata?.amount || "0");

    if (!topupRequestId || !entityType || !entityId || !amount) {
      throw new Error("Missing metadata in session");
    }

    // Check if already processed
    const { data: existingRequest } = await supabaseClient
      .from("topup_requests")
      .select("status")
      .eq("id", topupRequestId)
      .single();

    if (existingRequest?.status === "approved") {
      console.log("[CONFIRM-TOPUP-PAYMENT] Already processed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already processed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get current balance
    const table = entityType === "centro" ? "centri_assistenza" : "corners";
    const { data: entity } = await supabaseClient
      .from(table)
      .select("credit_balance")
      .eq("id", entityId)
      .single();

    const currentBalance = entity?.credit_balance || 0;
    const newBalance = currentBalance + amount;

    // Update entity balance
    const { error: updateError } = await supabaseClient
      .from(table)
      .update({
        credit_balance: newBalance,
        last_credit_update: new Date().toISOString(),
        payment_status: newBalance >= 100 ? "active" : newBalance >= 0 ? "warning" : "suspended",
      })
      .eq("id", entityId);

    if (updateError) {
      console.error("[CONFIRM-TOPUP-PAYMENT] Error updating balance:", updateError);
      throw updateError;
    }

    // Create transaction record
    await supabaseClient.from("credit_transactions").insert({
      entity_type: entityType,
      entity_id: entityId,
      transaction_type: "topup",
      amount: amount,
      balance_after: newBalance,
      description: `Ricarica via Stripe - €${amount.toFixed(2)}`,
    });

    // Update topup request status
    await supabaseClient
      .from("topup_requests")
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", topupRequestId);

    console.log("[CONFIRM-TOPUP-PAYMENT] Successfully credited €", amount, "to", entityType, entityId);

    return new Response(JSON.stringify({ 
      success: true,
      new_balance: newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CONFIRM-TOPUP-PAYMENT] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
