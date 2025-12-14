import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptQuoteRequest {
  quote_id: string;
  repair_request_id?: string;
  signature_data: string;
  session_id: string;
}

serve(async (req) => {
  console.log("accept-quote-signature: Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quote_id, repair_request_id, signature_data, session_id }: AcceptQuoteRequest = await req.json();
    
    console.log("accept-quote-signature: Processing quote", quote_id, "session", session_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const signedAt = new Date().toISOString();

    // Update quote status to accepted
    const { error: quoteError } = await supabase
      .from("quotes")
      .update({
        status: "accepted",
        signed_at: signedAt,
        signature_data: signature_data,
      })
      .eq("id", quote_id);

    if (quoteError) {
      console.error("accept-quote-signature: Quote update error", quoteError);
      throw new Error("Errore nell'aggiornamento del preventivo");
    }

    console.log("accept-quote-signature: Quote updated successfully");

    // Update repair request status if linked
    if (repair_request_id) {
      const { error: repairError } = await supabase
        .from("repair_requests")
        .update({
          status: "awaiting_pickup",
          quote_accepted_at: signedAt,
          awaiting_pickup_at: signedAt,
        })
        .eq("id", repair_request_id);

      if (repairError) {
        console.error("accept-quote-signature: Repair request update error", repairError);
        // Don't throw - quote is already accepted
      } else {
        console.log("accept-quote-signature: Repair request updated to awaiting_pickup");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        signed_at: signedAt 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("accept-quote-signature: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
