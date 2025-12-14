import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, campaign_id } = await req.json();

    console.log('[confirm-ad-payment] Confirming payment:', { session_id, campaign_id });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      console.log('[confirm-ad-payment] Payment not completed:', session.payment_status);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Pagamento non completato' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update campaign status
    const { data: campaign, error: updateError } = await supabase
      .from('display_ad_campaigns')
      .update({
        status: 'pending_approval',
        stripe_payment_intent_id: session.payment_intent,
        paid_at: new Date().toISOString()
      })
      .eq('id', campaign_id)
      .select()
      .single();

    if (updateError) {
      console.error('[confirm-ad-payment] Update error:', updateError);
      throw updateError;
    }

    console.log('[confirm-ad-payment] Campaign updated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      campaign 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[confirm-ad-payment] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
