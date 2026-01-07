import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailQueueItem {
  id: string;
  lead_id: string;
  template_id: string;
  sequence_id: string | null;
  step_number: number | null;
  scheduled_for: string;
  tracking_id: string;
  retry_count: number;
}

interface MarketingLead {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string;
  website: string | null;
  current_step: number;
  email_opens_count: number;
  email_clicks_count: number;
}

interface MarketingTemplate {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  content: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-email-processor: Starting email processing");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Parse request body to check for manual flag
  let isManualTrigger = false;
  try {
    const body = await req.json();
    isManualTrigger = body?.manual === true;
    console.log(`marketing-email-processor: Manual trigger: ${isManualTrigger}`);
  } catch {
    // No body or invalid JSON, treat as automatic
  }

  try {
    // Check if automation is enabled
    const { data: settings } = await supabase
      .from("marketing_automation_settings")
      .select("*")
      .single();

    // For manual triggers, only check if is_enabled (not auto_email_enabled)
    if (!settings?.is_enabled) {
      console.log("marketing-email-processor: Automation completely disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Automation disabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For automatic triggers, also check auto_email_enabled
    if (!isManualTrigger && !settings?.auto_email_enabled) {
      console.log("marketing-email-processor: Auto email disabled (not manual)");
      return new Response(
        JSON.stringify({ success: true, message: "Auto email disabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip time/day checks for manual triggers
    if (!isManualTrigger) {
      const now = new Date();
      const currentHour = now.getUTCHours() + 1; // Approximate CET
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[now.getDay()];

      if (currentHour < settings.email_send_hours_start || currentHour >= settings.email_send_hours_end) {
        console.log(`marketing-email-processor: Outside sending hours (${currentHour})`);
        return new Response(
          JSON.stringify({ success: true, message: "Outside sending hours", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!settings.email_send_days.includes(currentDay)) {
        console.log(`marketing-email-processor: Not a sending day (${currentDay})`);
        return new Response(
          JSON.stringify({ success: true, message: "Not a sending day", sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("marketing-email-processor: Skipping time/day checks (manual trigger)");
    }

    // Get pending emails that are due
    const nowDate = new Date();
    const { data: pendingEmails, error: queueError } = await supabase
      .from("marketing_email_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", nowDate.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(settings.max_emails_per_day);

    if (queueError) throw queueError;

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("marketing-email-processor: No pending emails");
      return new Response(
        JSON.stringify({ success: true, message: "No pending emails", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`marketing-email-processor: Found ${pendingEmails.length} pending emails`);

    // Check for unsubscribed emails
    const { data: unsubscribes } = await supabase
      .from("marketing_unsubscribes")
      .select("email");
    const unsubscribedEmails = new Set((unsubscribes || []).map(u => u.email.toLowerCase()));

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // SMTP config from settings
    const smtpConfig = settings.smtp_config as SmtpConfig | null;
    const senderName = settings.marketing_sender_name || "LinkRiparo";
    const physicalAddress = settings.physical_address || "Via Example 123, Roma";

    for (const email of pendingEmails as EmailQueueItem[]) {
      try {
        // Get lead info
        const { data: lead, error: leadError } = await supabase
          .from("marketing_leads")
          .select("*")
          .eq("id", email.lead_id)
          .single();

        if (leadError || !lead) {
          console.log(`marketing-email-processor: Lead not found for email ${email.id}`);
          await supabase
            .from("marketing_email_queue")
            .update({ status: 'cancelled', error_message: 'Lead not found' })
            .eq("id", email.id);
          skippedCount++;
          continue;
        }

        const typedLead = lead as MarketingLead;

        // Check if lead has email
        if (!typedLead.email) {
          console.log(`marketing-email-processor: Lead ${typedLead.business_name} has no email`);
          await supabase
            .from("marketing_email_queue")
            .update({ status: 'skipped', error_message: 'No email address' })
            .eq("id", email.id);
          skippedCount++;
          continue;
        }

        // Check if unsubscribed
        if (unsubscribedEmails.has(typedLead.email.toLowerCase())) {
          console.log(`marketing-email-processor: Email unsubscribed: ${typedLead.email}`);
          await supabase
            .from("marketing_email_queue")
            .update({ status: 'skipped', error_message: 'Email unsubscribed' })
            .eq("id", email.id);
          skippedCount++;
          continue;
        }

        // Check blacklist
        const emailDomain = typedLead.email.split('@')[1];
        if (settings.blacklisted_emails?.includes(typedLead.email) || 
            settings.blacklisted_domains?.includes(emailDomain)) {
          console.log(`marketing-email-processor: Email blacklisted: ${typedLead.email}`);
          await supabase
            .from("marketing_email_queue")
            .update({ status: 'skipped', error_message: 'Email blacklisted' })
            .eq("id", email.id);
          skippedCount++;
          continue;
        }

        // Check step condition if it's a sequence email
        if (email.sequence_id && email.step_number && email.step_number > 1) {
          const { data: step } = await supabase
            .from("marketing_sequence_steps")
            .select("condition")
            .eq("sequence_id", email.sequence_id)
            .eq("step_number", email.step_number)
            .single();

          if (step?.condition === 'no_response' && typedLead.email_opens_count > 0) {
            console.log(`marketing-email-processor: Skipping email for ${typedLead.business_name} - already opened previous emails`);
            await supabase
              .from("marketing_email_queue")
              .update({ status: 'skipped', error_message: 'Condition not met: lead has responded' })
              .eq("id", email.id);
            skippedCount++;
            continue;
          }
        }

        // Get template
        const { data: template, error: templateError } = await supabase
          .from("marketing_templates")
          .select("*")
          .eq("id", email.template_id)
          .single();

        if (templateError || !template) {
          console.log(`marketing-email-processor: Template not found for email ${email.id}`);
          await supabase
            .from("marketing_email_queue")
            .update({ status: 'failed', error_message: 'Template not found' })
            .eq("id", email.id);
          failedCount++;
          continue;
        }

        const typedTemplate = template as MarketingTemplate;

        // Build tracking URLs
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/marketing-track-email?t=${email.tracking_id}&a=open`;
        const clickTrackingBase = `${supabaseUrl}/functions/v1/marketing-track-email?t=${email.tracking_id}&a=click&url=`;
        
        // Determine role type from lead's business_type
        const roleType = (lead as any).business_type === 'corner' ? 'corner' : 'centro';
        
        // Build demo URL with type and lead ID for direct role assignment
        const demoBaseUrl = `https://lablinkriparo.com/auth?trial=true&type=${roleType}&lead=${email.lead_id}&email=${encodeURIComponent(typedLead.email)}`;
        const demoTrackingUrl = `${supabaseUrl}/functions/v1/marketing-track-email?t=${email.tracking_id}&a=demo&url=${encodeURIComponent(demoBaseUrl)}`;
        const interestTrackingUrl = `${supabaseUrl}/functions/v1/marketing-track-email?t=${email.tracking_id}&a=interest&url=${encodeURIComponent('https://lablinkriparo.com')}`;
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/marketing-unsubscribe?email=${encodeURIComponent(typedLead.email)}&lead_id=${email.lead_id}`;

        // Replace variables in template (including new tracking URL placeholders)
        let emailContent = typedTemplate.content
          .replace(/\{\{business_name\}\}/g, typedLead.business_name)
          .replace(/\{\{address\}\}/g, typedLead.address || '')
          .replace(/\{\{phone\}\}/g, typedLead.phone || '')
          .replace(/\{\{website\}\}/g, typedLead.website || '')
          .replace(/\{\{email\}\}/g, typedLead.email)
          .replace(/\{\{tracking_url_demo\}\}/g, demoTrackingUrl)
          .replace(/\{\{tracking_url_interest\}\}/g, interestTrackingUrl)
          .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);

        // Check if content is already HTML or plain text
        const isHtml = emailContent.includes('<') && emailContent.includes('>');
        
        if (!isHtml) {
          // Wrap plain text in HTML structure with CTA buttons
          emailContent = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    ${emailContent.replace(/\n/g, '<br>')}
    
    <!-- CTA Buttons -->
    <div style="text-align:center;margin:30px 0;">
      <a href="${demoTrackingUrl}" 
         style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;">
        🚀 Prova Gratuita
      </a>
    </div>
    <p style="text-align:center;margin:15px 0;">
      <a href="${interestTrackingUrl}" style="color:#2563eb;text-decoration:underline;font-size:14px;">
        Sono interessato, maggiori info
      </a>
    </p>
  </div>
</body>
</html>`;
        }

        // Replace remaining links with tracked versions (except already tracked ones)
        emailContent = emailContent.replace(
          /href="(https?:\/\/(?!.*marketing-track-email)[^"]+)"/g, 
          (match, url) => `href="${clickTrackingBase}${encodeURIComponent(url)}"`
        );

        // Add anti-spam footer with unsubscribe link
        const antiSpamFooter = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e0e0e0;text-align:center;color:#888;font-size:12px;">
  <p style="margin:0 0 10px 0;">${senderName}</p>
  <p style="margin:0 0 10px 0;">${physicalAddress}</p>
  <p style="margin:0;">
    <a href="${unsubscribeUrl}" style="color:#888;text-decoration:underline;">Clicca qui per disiscriverti</a>
  </p>
</div>`;

        // Insert footer before </body> or append
        if (emailContent.includes('</body>')) {
          emailContent = emailContent.replace('</body>', `${antiSpamFooter}</body>`);
        } else {
          emailContent += antiSpamFooter;
        }

        // Add tracking pixel
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;" alt="" />`;
        if (emailContent.includes('</body>')) {
          emailContent = emailContent.replace('</body>', `${trackingPixel}</body>`);
        } else {
          emailContent += trackingPixel;
        }

        // Build subject
        let emailSubject = typedTemplate.subject || `${typedTemplate.name} - LinkRiparo`;
        emailSubject = emailSubject.replace(/\{\{business_name\}\}/g, typedLead.business_name);

        // Mark as processing
        await supabase
          .from("marketing_email_queue")
          .update({ status: 'processing' })
          .eq("id", email.id);

        // Send email via send-email-smtp function
        console.log(`marketing-email-processor: Sending email to ${typedLead.email}`);

        const { data: emailResult, error: emailError } = await supabase.functions.invoke("send-email-smtp", {
          body: {
            to: typedLead.email,
            subject: emailSubject,
            html: emailContent,
            from_name_override: senderName,
            marketing: true,
            unsubscribe_email: typedLead.email,
            unsubscribe_url: unsubscribeUrl,
            lead_id: email.lead_id,
            smtp_config: smtpConfig,
          },
        });

        if (emailError) {
          console.error("marketing-email-processor: Email send failed:", emailError);
          await supabase
            .from("marketing_email_queue")
            .update({ 
              status: 'failed', 
              error_message: emailError.message || 'Send failed',
              retry_count: email.retry_count + 1 
            })
            .eq("id", email.id);
          failedCount++;
          continue;
        }

        if (!emailResult?.success) {
          console.error("marketing-email-processor: Email send failed:", emailResult?.error);
          await supabase
            .from("marketing_email_queue")
            .update({ 
              status: 'failed', 
              error_message: emailResult?.error || 'Send failed',
              retry_count: email.retry_count + 1 
            })
            .eq("id", email.id);
          failedCount++;
          continue;
        }

        // Mark as sent
        await supabase
          .from("marketing_email_queue")
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq("id", email.id);

        // Update lead
        await supabase
          .from("marketing_leads")
          .update({ 
            last_email_sent_at: new Date().toISOString(),
            current_step: email.step_number || typedLead.current_step + 1,
            status: typedLead.current_step === 0 ? 'contacted' : lead.status,
            contacted_at: typedLead.current_step === 0 ? new Date().toISOString() : lead.contacted_at,
          })
          .eq("id", email.lead_id);

        // Update funnel stage if first contact
        if (typedLead.current_step === 0) {
          const { data: contactedStage } = await supabase
            .from("marketing_funnel_stages")
            .select("id")
            .eq("stage_order", 2)
            .single();

          if (contactedStage) {
            await supabase
              .from("marketing_leads")
              .update({ funnel_stage_id: contactedStage.id })
              .eq("id", email.lead_id);
          }
        }

        // Schedule next step in sequence
        if (email.sequence_id) {
          const { data: nextStep } = await supabase
            .from("marketing_sequence_steps")
            .select("*")
            .eq("sequence_id", email.sequence_id)
            .eq("step_number", (email.step_number || 0) + 1)
            .eq("is_active", true)
            .single();

          if (nextStep) {
            const scheduledFor = new Date();
            scheduledFor.setHours(scheduledFor.getHours() + nextStep.delay_hours);
            scheduledFor.setDate(scheduledFor.getDate() + nextStep.delay_days);

            await supabase
              .from("marketing_email_queue")
              .insert({
                lead_id: email.lead_id,
                template_id: nextStep.template_id,
                sequence_id: email.sequence_id,
                step_number: nextStep.step_number,
                scheduled_for: scheduledFor.toISOString(),
                status: 'pending',
              });

            console.log(`marketing-email-processor: Scheduled next step ${nextStep.step_number} for lead ${typedLead.business_name}`);
          } else {
            // Sequence completed
            await supabase
              .from("marketing_leads")
              .update({ sequence_completed_at: new Date().toISOString() })
              .eq("id", email.lead_id);
          }
        }

        sentCount++;
        console.log(`marketing-email-processor: Sent email to ${typedLead.email} via ${emailResult.method || 'smtp'}`);

        // Log success
        await supabase
          .from("marketing_automation_logs")
          .insert({
            log_type: 'email',
            message: `Email inviata a ${typedLead.business_name} (${typedLead.email}) via ${emailResult.method || 'smtp'}`,
            details: { 
              lead_id: email.lead_id, 
              template_id: email.template_id,
              sequence_step: email.step_number,
              method: emailResult.method,
            },
            lead_id: email.lead_id,
            email_queue_id: email.id,
          });

      } catch (emailError) {
        console.error("marketing-email-processor: Error processing email:", emailError);
        
        await supabase
          .from("marketing_email_queue")
          .update({ 
            status: 'failed', 
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
            retry_count: email.retry_count + 1 
          })
          .eq("id", email.id);

        await supabase
          .from("marketing_automation_logs")
          .insert({
            log_type: 'error',
            message: `Errore invio email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
            details: { email_queue_id: email.id, error: String(emailError) },
            email_queue_id: email.id,
          });

        failedCount++;
      }
    }

    console.log(`marketing-email-processor: Completed. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        failed: failedCount,
        skipped: skippedCount,
        processed: sentCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("marketing-email-processor: Error:", error);
    
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'error',
        message: `Errore generale email processor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) },
      });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
