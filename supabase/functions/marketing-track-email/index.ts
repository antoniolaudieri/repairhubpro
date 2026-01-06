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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to detect demo/trial intent from URL
const isDemoOrTrialLink = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('demo') ||
    lowerUrl.includes('prova') ||
    lowerUrl.includes('trial') ||
    lowerUrl.includes('registra') ||
    lowerUrl.includes('/auth') ||
    lowerUrl.includes('prenota') ||
    lowerUrl.includes('interessato') ||
    lowerUrl.includes('contatta')
  );
};

// Helper to detect interest from URL
const isInterestLink = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes('interessato') ||
    lowerUrl.includes('info') ||
    lowerUrl.includes('scopri') ||
    lowerUrl.includes('contatta')
  );
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const action = url.searchParams.get("a"); // 'open', 'click', 'demo', 'interest'
  const redirectUrl = url.searchParams.get("url");

  console.log(`marketing-track-email: Received request - action=${action}, trackingId=${trackingId}, url=${redirectUrl}`);

  if (!trackingId) {
    // Return pixel anyway to not break emails
    return new Response(TRACKING_PIXEL, {
      headers: {
        ...corsHeaders,
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

          // Move to "Interested" funnel stage (stage_order = 3)
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

      } else if (action === "demo" || action === "interest" || action === "click") {
        // Track click
        await supabase
          .from("marketing_email_queue")
          .update({
            clicked_at: now,
            click_count: (emailItem.click_count || 0) + 1,
          })
          .eq("id", emailItem.id);

        // Get lead info
        const { data: lead } = await supabase
          .from("marketing_leads")
          .select("email_clicks_count, funnel_stage_id, email")
          .eq("id", emailItem.lead_id)
          .single();

        if (lead) {
          // Update lead stats
          await supabase
            .from("marketing_leads")
            .update({
              email_clicks_count: (lead.email_clicks_count || 0) + 1,
              status: action === "demo" ? 'demo_requested' : 'interested',
              last_interaction_at: now,
            })
            .eq("id", emailItem.lead_id);

          // Determine the funnel stage based on action
          let targetStageOrder = 3; // Default: Interested
          
          if (action === "demo" || (redirectUrl && isDemoOrTrialLink(decodeURIComponent(redirectUrl)))) {
            targetStageOrder = 4; // Demo Requested
          } else if (action === "interest" || (redirectUrl && isInterestLink(decodeURIComponent(redirectUrl)))) {
            targetStageOrder = 3; // Interested
          }

          const { data: targetStage } = await supabase
            .from("marketing_funnel_stages")
            .select("id")
            .eq("stage_order", targetStageOrder)
            .single();

          if (targetStage) {
            await supabase
              .from("marketing_leads")
              .update({ funnel_stage_id: targetStage.id })
              .eq("id", emailItem.lead_id);
          }

          // Log the interaction
          const actionLabel = action === "demo" ? "Demo/Prova Gratuita" : 
                             action === "interest" ? "Interessato" : "Click generico";
          
          await supabase
            .from("marketing_automation_logs")
            .insert({
              log_type: action === "demo" ? 'conversion' : 'engagement',
              message: `Lead ha cliccato: ${actionLabel}`,
              details: { 
                lead_id: emailItem.lead_id, 
                email: lead.email,
                action: action,
                original_url: redirectUrl 
              },
              lead_id: emailItem.lead_id,
            });

          console.log(`marketing-track-email: Tracked ${action} for ${trackingId}`);

          // For demo actions, redirect to auth page with lead info
          if (action === "demo" && redirectUrl) {
            const leadEmail = lead.email || '';
            const authUrl = new URL(decodeURIComponent(redirectUrl));
            authUrl.searchParams.set('trial', 'true');
            authUrl.searchParams.set('lead', emailItem.lead_id);
            if (leadEmail) {
              authUrl.searchParams.set('email', leadEmail);
            }
            
            console.log(`marketing-track-email: Redirecting to auth with trial params: ${authUrl.toString()}`);
            return new Response(null, {
              status: 302,
              headers: {
                ...corsHeaders,
                "Location": authUrl.toString(),
                "Cache-Control": "no-cache, no-store, must-revalidate",
              },
            });
          }
        }

        // Redirect to the original URL if provided
        if (redirectUrl) {
          console.log(`marketing-track-email: Redirecting to ${redirectUrl}`);
          return new Response(null, {
            status: 302,
            headers: {
              ...corsHeaders,
              "Location": decodeURIComponent(redirectUrl),
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });
        }
      }
    }

  } catch (error) {
    console.error("marketing-track-email: Error tracking:", error);
  }

  // Return tracking pixel for open events
  if (action === "open") {
    return new Response(TRACKING_PIXEL, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // For click without redirect URL, return 204
  return new Response(null, { 
    status: 204,
    headers: corsHeaders,
  });
};

serve(handler);
