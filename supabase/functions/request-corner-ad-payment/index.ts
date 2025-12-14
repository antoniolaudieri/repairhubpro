import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_corner_id, corner_id, campaign_id } = await req.json();
    
    console.log('[request-corner-ad-payment] Processing request:', { campaign_corner_id, corner_id, campaign_id });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get campaign corner details with campaign and corner info
    const { data: campaignCorner, error: fetchError } = await supabase
      .from('display_ad_campaign_corners')
      .select(`
        *,
        campaign:display_ad_campaigns(id, ad_title, advertiser_name, status),
        corner:corners(id, business_name, email)
      `)
      .eq('id', campaign_corner_id)
      .single();

    if (fetchError || !campaignCorner) {
      console.error('[request-corner-ad-payment] Fetch error:', fetchError);
      throw new Error('Record non trovato');
    }

    // Update payment status to requested
    const { error: updateError } = await supabase
      .from('display_ad_campaign_corners')
      .update({
        payment_status: 'requested',
        payment_requested_at: new Date().toISOString()
      })
      .eq('id', campaign_corner_id);

    if (updateError) {
      console.error('[request-corner-ad-payment] Update error:', updateError);
      throw updateError;
    }

    // Get platform admins
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'platform_admin');

    // Send push notifications to admins
    if (admins && admins.length > 0) {
      const adminIds = admins.map(a => a.user_id);
      
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: adminIds,
            payload: {
              title: '💰 Richiesta Pagamento Corner',
              body: `${campaignCorner.corner?.business_name} richiede €${campaignCorner.corner_revenue?.toFixed(2)} per "${campaignCorner.campaign?.ad_title}"`,
              url: '/admin/pubblicita'
            }
          }
        });
        console.log('[request-corner-ad-payment] Push notifications sent to admins');
      } catch (pushError) {
        console.error('[request-corner-ad-payment] Push notification error:', pushError);
      }
    }

    // Send email notification via send-email-smtp edge function
    try {
      await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: 'info@lablinkriparo.it',
          subject: `💰 Richiesta Pagamento Pubblicità - ${campaignCorner.corner?.business_name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Richiesta Pagamento Corner</h2>
              
              <p><strong>${campaignCorner.corner?.business_name}</strong> ha richiesto il pagamento per la campagna pubblicitaria.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Dettagli</h3>
                <p><strong>Campagna:</strong> ${campaignCorner.campaign?.ad_title}</p>
                <p><strong>Inserzionista:</strong> ${campaignCorner.campaign?.advertiser_name}</p>
                <p><strong>Corner:</strong> ${campaignCorner.corner?.business_name}</p>
                <p><strong>Email Corner:</strong> ${campaignCorner.corner?.email}</p>
                <p style="font-size: 24px; color: #16a34a; margin-top: 16px;">
                  <strong>Importo: €${campaignCorner.corner_revenue?.toFixed(2)}</strong>
                </p>
              </div>
              
              <p>Accedi al pannello admin per gestire il pagamento.</p>
              
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Questa email è stata inviata automaticamente da LabLinkRiparo.
              </p>
            </div>
          `
        }
      });
      console.log('[request-corner-ad-payment] Email sent to admin');
    } catch (emailError) {
      console.error('[request-corner-ad-payment] Email error:', emailError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[request-corner-ad-payment] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
