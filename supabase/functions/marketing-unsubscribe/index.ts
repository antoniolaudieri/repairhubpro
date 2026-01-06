import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HTML page for unsubscribe confirmation
const getUnsubscribeHtml = (success: boolean, message: string) => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Disiscrizione - LinkRiparo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    .icon.success { background: #dcfce7; }
    .icon.error { background: #fee2e2; }
    h1 { 
      font-size: 24px; 
      color: #1a1a1a; 
      margin-bottom: 16px;
    }
    p { 
      color: #666; 
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .logo {
      margin-top: 32px;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${success ? 'success' : 'error'}">
      ${success ? '✓' : '✕'}
    </div>
    <h1>${success ? 'Disiscrizione Completata' : 'Errore'}</h1>
    <p>${message}</p>
    <div class="logo">LinkRiparo</div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get email from URL params (for GET requests from email links)
    let email = url.searchParams.get("email");
    let leadId = url.searchParams.get("lead_id");
    let reason = url.searchParams.get("reason");

    // Or from body (for POST requests)
    if (req.method === "POST") {
      const body = await req.json();
      email = body.email || email;
      leadId = body.lead_id || leadId;
      reason = body.reason || reason;
    }

    if (!email) {
      return new Response(
        getUnsubscribeHtml(false, "Email non specificata."),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    console.log("marketing-unsubscribe: Unsubscribing email:", email);

    // Insert into marketing_unsubscribes
    const { error: unsubError } = await supabase
      .from("marketing_unsubscribes")
      .upsert({
        email: email.toLowerCase(),
        lead_id: leadId || null,
        reason: reason || 'User requested unsubscribe',
        unsubscribed_at: new Date().toISOString(),
      }, {
        onConflict: "email"
      });

    if (unsubError) {
      console.error("marketing-unsubscribe: Error inserting unsubscribe:", unsubError);
      // Continue anyway - maybe it's a duplicate
    }

    // Update lead status if we have lead_id
    if (leadId) {
      await supabase
        .from("marketing_leads")
        .update({ 
          unsubscribed_at: new Date().toISOString(),
          unsubscribed_reason: reason || 'User requested unsubscribe',
          status: 'unsubscribed'
        })
        .eq("id", leadId);
    } else {
      // Try to find lead by email
      const { data: lead } = await supabase
        .from("marketing_leads")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (lead) {
        await supabase
          .from("marketing_leads")
          .update({ 
            unsubscribed_at: new Date().toISOString(),
            unsubscribed_reason: reason || 'User requested unsubscribe',
            status: 'unsubscribed'
          })
          .eq("id", lead.id);
      }
    }

    // Cancel any pending emails for this lead
    if (leadId) {
      await supabase
        .from("marketing_email_queue")
        .update({ 
          status: 'cancelled',
          error_message: 'User unsubscribed'
        })
        .eq("lead_id", leadId)
        .eq("status", "pending");
    }

    // Log the unsubscribe
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'unsubscribe',
        message: `Email disiscritto: ${email}`,
        details: { email, lead_id: leadId, reason },
        lead_id: leadId || null,
      });

    console.log("marketing-unsubscribe: Successfully unsubscribed:", email);

    return new Response(
      getUnsubscribeHtml(
        true, 
        `La tua email (${email}) è stata rimossa dalla nostra lista. Non riceverai più comunicazioni marketing da parte nostra.`
      ),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );

  } catch (error: unknown) {
    console.error("marketing-unsubscribe: Error:", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    
    return new Response(
      getUnsubscribeHtml(false, `Si è verificato un errore: ${message}`),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );
  }
});
