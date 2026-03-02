import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent PNG pixel
const PIXEL = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), c => c.charCodeAt(0));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('a');
  const trackingId = url.searchParams.get('t');

  if (!trackingId) {
    return new Response('Missing tracking id', { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Get recipient
    const { data: recipient, error } = await supabase
      .from('ricondizionati_campaign_recipients')
      .select('id, campaign_id, opened_at, open_count, clicked_at, click_count, copied_coupon_at, copy_count')
      .eq('tracking_id', trackingId)
      .single();

    if (error || !recipient) {
      console.error('Recipient not found:', error);
      if (action === 'open') {
        return new Response(PIXEL, { headers: { ...corsHeaders, 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' } });
      }
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    if (action === 'open') {
      // Track email open
      await supabase
        .from('ricondizionati_campaign_recipients')
        .update({
          opened_at: recipient.opened_at || new Date().toISOString(),
          open_count: (recipient.open_count || 0) + 1,
        })
        .eq('id', recipient.id);

      // Update campaign aggregate
      if (!recipient.opened_at) {
        await supabase.rpc('', {}).catch(() => {});
        // Increment total_opened on campaign
        const { data: campaign } = await supabase
          .from('ricondizionati_campaigns')
          .select('total_opened')
          .eq('id', recipient.campaign_id)
          .single();
        
        if (campaign) {
          await supabase
            .from('ricondizionati_campaigns')
            .update({ total_opened: (campaign.total_opened || 0) + 1 })
            .eq('id', recipient.campaign_id);
        }
      }

      return new Response(PIXEL, {
        headers: { ...corsHeaders, 'Content-Type': 'image/png', 'Cache-Control': 'no-cache, no-store' },
      });

    } else if (action === 'click') {
      // Track click
      await supabase
        .from('ricondizionati_campaign_recipients')
        .update({
          clicked_at: recipient.clicked_at || new Date().toISOString(),
          click_count: (recipient.click_count || 0) + 1,
        })
        .eq('id', recipient.id);

      // Update campaign aggregate
      if (!recipient.clicked_at) {
        const { data: campaign } = await supabase
          .from('ricondizionati_campaigns')
          .select('total_clicked')
          .eq('id', recipient.campaign_id)
          .single();
        
        if (campaign) {
          await supabase
            .from('ricondizionati_campaigns')
            .update({ total_clicked: (campaign.total_clicked || 0) + 1 })
            .eq('id', recipient.campaign_id);
        }
      }

      // Get campaign destination URL
      const { data: campaignData } = await supabase
        .from('ricondizionati_campaigns')
        .select('destination_url, coupon_code')
        .eq('id', recipient.campaign_id)
        .single();

      // Redirect to promo-redirect page on the frontend
      const appUrl = Deno.env.get('APP_URL') || 'https://repairhubpro.lovable.app';
      const redirectUrl = `${appUrl}/promo-redirect?t=${trackingId}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    return new Response('Invalid action', { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('Error:', err);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
