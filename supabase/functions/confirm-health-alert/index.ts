import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alert_id, action, notes } = await req.json();

    if (!alert_id || !action) {
      throw new Error("alert_id and action are required");
    }

    if (!["confirm", "dismiss"].includes(action)) {
      throw new Error("action must be 'confirm' or 'dismiss'");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[ConfirmHealthAlert] Processing alert ${alert_id} with action: ${action}`);

    // Fetch the alert first
    const { data: alert, error: fetchError } = await supabase
      .from("device_health_alerts")
      .select("*, customer:customers(id, name, email, phone)")
      .eq("id", alert_id)
      .single();

    if (fetchError || !alert) {
      throw new Error(`Alert not found: ${fetchError?.message || "unknown error"}`);
    }

    // Update alert with Centro review
    const updateData: Record<string, any> = {
      centro_reviewed: true,
      centro_reviewed_at: new Date().toISOString(),
      centro_action: action,
    };

    if (notes) {
      updateData.centro_notes = notes;
    }

    if (action === "confirm") {
      // Change status so customer can see it
      updateData.status = "confirmed";
    } else {
      // Dismiss - mark as resolved without notifying customer
      updateData.status = "dismissed";
    }

    const { error: updateError } = await supabase
      .from("device_health_alerts")
      .update(updateData)
      .eq("id", alert_id);

    if (updateError) {
      throw new Error(`Failed to update alert: ${updateError.message}`);
    }

    console.log(`[ConfirmHealthAlert] Alert ${alert_id} updated successfully`);

    // If confirmed, send notification to customer
    if (action === "confirm" && alert.customer?.email) {
      // Create in-app notification
      await supabase.from("customer_notifications").insert({
        customer_email: alert.customer.email,
        title: alert.title,
        message: alert.message,
        type: `health_alert_${alert.severity}`,
        data: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          recommended_action: alert.recommended_action,
          discount_offered: alert.discount_offered,
          confirmed_by_centro: true,
        },
      });

      // Update push_sent_at to indicate notification was triggered
      await supabase
        .from("device_health_alerts")
        .update({ push_sent_at: new Date().toISOString() })
        .eq("id", alert_id);

      console.log(`[ConfirmHealthAlert] Notification sent to customer: ${alert.customer.email}`);

      // Optionally send email if we have SMTP configured
      try {
        // Get centro info for branding
        const { data: centro } = await supabase
          .from("centri_assistenza")
          .select("business_name, email, phone")
          .eq("id", alert.centro_id)
          .single();

        if (centro) {
          // Try to send email via send-email-smtp
          await supabase.functions.invoke("send-email-smtp", {
            body: {
              to: alert.customer.email,
              subject: `⚠️ ${alert.title} - ${centro.business_name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f59e0b;">${alert.title}</h2>
                  <p>${alert.message}</p>
                  ${alert.recommended_action ? `
                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <strong>Azione consigliata:</strong><br/>
                      ${alert.recommended_action}
                    </div>
                  ` : ""}
                  ${alert.discount_offered ? `
                    <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <strong>🎁 Sconto speciale: ${alert.discount_offered}%</strong><br/>
                      Presenta questo messaggio per usufruire dello sconto!
                    </div>
                  ` : ""}
                  <p style="margin-top: 30px; color: #666;">
                    Per prenotare un controllo, contattaci:<br/>
                    📧 ${centro.email}<br/>
                    📞 ${centro.phone}
                  </p>
                  <p style="color: #999; font-size: 12px;">
                    — ${centro.business_name}
                  </p>
                </div>
              `,
              centro_id: alert.centro_id,
            },
          });
          
          // Update email_sent_at
          await supabase
            .from("device_health_alerts")
            .update({ email_sent_at: new Date().toISOString() })
            .eq("id", alert_id);

          console.log(`[ConfirmHealthAlert] Email sent to: ${alert.customer.email}`);
        }
      } catch (emailError) {
        // Email is optional, log but don't fail
        console.log(`[ConfirmHealthAlert] Email sending skipped or failed:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        alert_id,
        customer_notified: action === "confirm",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[ConfirmHealthAlert] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
