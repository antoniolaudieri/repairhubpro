import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, centro_id, campaign_type, reason } = await req.json();

    if (!email || !centro_id) {
      return new Response(
        JSON.stringify({ error: "email and centro_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Unsubscribing email:", email, "from centro:", centro_id);

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find customer by email and centro
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", email)
      .eq("centro_id", centro_id)
      .single();

    // Insert into email_unsubscribes
    const { error: unsubError } = await supabase
      .from("email_unsubscribes")
      .upsert({
        email,
        centro_id,
        customer_id: customer?.id || null,
        campaign_type: campaign_type || "all",
        reason: reason || null,
        unsubscribed_at: new Date().toISOString(),
      }, {
        onConflict: "centro_id,email"
      });

    if (unsubError) {
      console.error("Error inserting unsubscribe:", unsubError);
      return new Response(
        JSON.stringify({ error: unsubError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update customer_profiles to set marketing consents to false
    if (customer?.id) {
      const consentUpdates: Record<string, boolean> = {};
      
      if (campaign_type === "all" || campaign_type === "email") {
        consentUpdates.email_consent = false;
        consentUpdates.marketing_consent = false;
      }
      if (campaign_type === "sms") {
        consentUpdates.sms_consent = false;
      }

      const { error: profileError } = await supabase
        .from("customer_profiles")
        .update({
          ...consentUpdates,
          consent_updated_at: new Date().toISOString(),
        })
        .eq("customer_id", customer.id)
        .eq("centro_id", centro_id);

      if (profileError) {
        console.error("Error updating profile consents:", profileError);
        // Don't fail the request, unsubscribe was successful
      }
    }

    console.log("Email unsubscribed successfully:", email);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in unsubscribe-email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});