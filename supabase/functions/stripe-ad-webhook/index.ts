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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    
    // If webhook secret is set, verify signature
    const webhookSecret = Deno.env.get('STRIPE_AD_WEBHOOK_SECRET');
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('[stripe-ad-webhook] Signature verification failed:', err);
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
          status: 400,
          headers: corsHeaders 
        });
      }
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }

    console.log('[stripe-ad-webhook] Event received:', event.type);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Check if this is an ad campaign payment
      if (session.metadata?.type === 'display_ad' && session.metadata?.campaign_id) {
        const campaignId = session.metadata.campaign_id;
        
        console.log('[stripe-ad-webhook] Processing ad payment for campaign:', campaignId);

        // Update campaign status
        const { error: updateError } = await supabase
          .from('display_ad_campaigns')
          .update({
            status: 'pending_approval',
            stripe_payment_intent_id: session.payment_intent,
            paid_at: new Date().toISOString()
          })
          .eq('id', campaignId);

        if (updateError) {
          console.error('[stripe-ad-webhook] Update error:', updateError);
          throw updateError;
        }

        console.log('[stripe-ad-webhook] Campaign updated to pending_approval');

        // TODO: Send notification to admin about new pending campaign
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[stripe-ad-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
