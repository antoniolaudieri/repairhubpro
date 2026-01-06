import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1x1 transparent PNG
const TRACKING_PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const action = url.searchParams.get("a"); // 'open' or 'click'
  const redirectUrl = url.searchParams.get("url");

  if (!trackingId) {
    // Return pixel anyway to not break emails
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the email queue item
    const { data: emailItem, error: findError } = await supabase
      .from("marketing_email_queue")
      .select("id, lead_id, open_count, click_count, opened_at")
      .eq("tracking_id", trackingId)
      .single();

    if (findError || !emailItem) {
      console.log(`marketing-track-email: Tracking ID not found: ${trackingId}`);
    } else {
      const now = new Date().toISOString();

      if (action === "open") {
        // Track email open
        await supabase
          .from("marketing_email_queue")
          .update({
            opened_at: emailItem.opened_at || now,
            open_count: (emailItem.open_count || 0) + 1,
          })
          .eq("id", emailItem.id);

        // Update lead stats
        const { data: lead } = await supabase
          .from("marketing_leads")
          .select("email_opens_count, funnel_stage_id")
          .eq("id", emailItem.lead_id)
          .single();

        if (lead) {
          await supabase
            .from("marketing_leads")
            .update({
              email_opens_count: (lead.email_opens_count || 0) + 1,
              status: 'interested',
            })
            .eq("id", emailItem.lead_id);

          // Move to "Interested" funnel stage
          const { data: interestedStage } = await supabase
            .from("marketing_funnel_stages")
            .select("id")
            .eq("stage_order", 3)
            .single();

          if (interestedStage && lead.funnel_stage_id !== interestedStage.id) {
            await supabase
              .from("marketing_leads")
              .update({ funnel_stage_id: interestedStage.id })
              .eq("id", emailItem.lead_id);
          }
        }

        console.log(`marketing-track-email: Tracked open for ${trackingId}`);

      } else if (action === "click" && redirectUrl) {
        // Track click
        await supabase
          .from("marketing_email_queue")
          .update({
            clicked_at: now,
            click_count: (emailItem.click_count || 0) + 1,
          })
          .eq("id", emailItem.id);

        // Update lead stats
        const { data: lead } = await supabase
          .from("marketing_leads")
          .select("email_clicks_count, funnel_stage_id, email")
          .eq("id", emailItem.lead_id)
          .single();

        if (lead) {
          await supabase
            .from("marketing_leads")
            .update({
              email_clicks_count: (lead.email_clicks_count || 0) + 1,
              status: 'interested',
              last_interaction_at: now,
            })
            .eq("id", emailItem.lead_id);

          // Check if this is a free trial link
          const decodedUrl = decodeURIComponent(redirectUrl).toLowerCase();
          const isFreeTrialLink = 
            decodedUrl.includes('prova') || 
            decodedUrl.includes('trial') || 
            decodedUrl.includes('registra') ||
            decodedUrl.includes('/auth');

          if (isFreeTrialLink) {
            // Move to "Demo Requested" funnel stage
            const { data: demoStage } = await supabase
              .from("marketing_funnel_stages")
              .select("id")
              .eq("stage_order", 4)
              .single();

            if (demoStage) {
              await supabase
                .from("marketing_leads")
                .update({ funnel_stage_id: demoStage.id })
                .eq("id", emailItem.lead_id);
            }

            // Log the free trial click
            await supabase
              .from("marketing_automation_logs")
              .insert({
                log_type: 'conversion',
                message: `Lead ha cliccato link prova gratuita`,
                details: { 
                  lead_id: emailItem.lead_id, 
                  email: lead.email,
                  original_url: redirectUrl 
                },
                lead_id: emailItem.lead_id,
              });

            // Redirect to auth page with lead info
            const leadEmail = lead.email || '';
            const authUrl = new URL(decodeURIComponent(redirectUrl));
            
            // If the URL is already an auth page, add lead parameters
            if (authUrl.pathname.includes('/auth') || isFreeTrialLink) {
              authUrl.searchParams.set('trial', 'true');
              authUrl.searchParams.set('lead', emailItem.lead_id);
              if (leadEmail) {
                authUrl.searchParams.set('email', leadEmail);
              }
              
              console.log(`marketing-track-email: Redirecting to auth with trial params: ${authUrl.toString()}`);
              return new Response(null, {
                status: 302,
                headers: {
                  "Location": authUrl.toString(),
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                },
              });
            }
          } else {
            // Regular click - just move to interested stage
            const { data: interestedStage } = await supabase
              .from("marketing_funnel_stages")
              .select("id")
              .eq("stage_order", 3)
              .single();

            if (interestedStage && lead.funnel_stage_id !== interestedStage.id) {
              await supabase
                .from("marketing_leads")
                .update({ funnel_stage_id: interestedStage.id })
                .eq("id", emailItem.lead_id);
            }
          }
        }

        console.log(`marketing-track-email: Tracked click for ${trackingId}, redirecting to ${redirectUrl}`);

        // Redirect to the original URL
        return new Response(null, {
          status: 302,
          headers: {
            "Location": decodeURIComponent(redirectUrl),
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }
    }

  } catch (error) {
    console.error("marketing-track-email: Error tracking:", error);
  }

  // Return tracking pixel for open events
  if (action === "open") {
    return new Response(TRACKING_PIXEL, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // For click without redirect URL, return 204
  return new Response(null, { status: 204 });
};

serve(handler);
