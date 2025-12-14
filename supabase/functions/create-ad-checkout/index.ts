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
    const {
      advertiser_name,
      advertiser_email,
      advertiser_phone,
      advertiser_company,
      ad_title,
      ad_description,
      ad_image_url,
      ad_gradient,
      ad_icon,
      ad_type,
      start_date,
      end_date,
      corner_ids,
      success_url,
      cancel_url
    } = await req.json();

    console.log('[create-ad-checkout] Creating checkout for:', { 
      advertiser_email, 
      ad_title, 
      corner_count: corner_ids?.length 
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pricing settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['ad_price_per_corner_per_week', 'ad_corner_revenue_percentage']);

    const pricePerCornerPerWeek = settings?.find(s => s.key === 'ad_price_per_corner_per_week')?.value || 5;
    const cornerPercentage = settings?.find(s => s.key === 'ad_corner_revenue_percentage')?.value || 50;

    // Calculate weeks
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(days / 7);

    // Calculate pricing
    const totalPrice = pricePerCornerPerWeek * corner_ids.length * weeks;
    const cornerRevenueTotal = totalPrice * (cornerPercentage / 100);
    const platformRevenue = totalPrice - cornerRevenueTotal;
    const cornerRevenueEach = cornerRevenueTotal / corner_ids.length;

    console.log('[create-ad-checkout] Pricing:', { 
      weeks, 
      totalPrice, 
      platformRevenue, 
      cornerRevenueTotal 
    });

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from('display_ad_campaigns')
      .insert({
        advertiser_name,
        advertiser_email,
        advertiser_phone,
        advertiser_company,
        ad_title,
        ad_description,
        ad_image_url,
        ad_gradient,
        ad_icon,
        ad_type,
        start_date,
        end_date,
        total_price: totalPrice,
        platform_revenue: platformRevenue,
        corner_revenue_total: cornerRevenueTotal,
        status: 'pending_payment'
      })
      .select()
      .single();

    if (campaignError) {
      console.error('[create-ad-checkout] Campaign creation error:', campaignError);
      throw new Error('Errore creazione campagna');
    }

    // Create corner assignments
    const cornerAssignments = corner_ids.map((corner_id: string) => ({
      campaign_id: campaign.id,
      corner_id,
      corner_revenue: cornerRevenueEach
    }));

    const { error: assignError } = await supabase
      .from('display_ad_campaign_corners')
      .insert(cornerAssignments);

    if (assignError) {
      console.error('[create-ad-checkout] Corner assignment error:', assignError);
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Campagna Pubblicitaria: ${ad_title}`,
              description: `${corner_ids.length} Corner × ${weeks} settimane`,
            },
            unit_amount: Math.round(totalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${success_url}?campaign_id=${campaign.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cancel_url}?campaign_id=${campaign.id}`,
      customer_email: advertiser_email,
      metadata: {
        campaign_id: campaign.id,
        type: 'display_ad'
      }
    });

    // Update campaign with session ID
    await supabase
      .from('display_ad_campaigns')
      .update({ stripe_session_id: session.id })
      .eq('id', campaign.id);

    console.log('[create-ad-checkout] Checkout session created:', session.id);

    return new Response(JSON.stringify({ 
      url: session.url,
      campaign_id: campaign.id,
      session_id: session.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[create-ad-checkout] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
