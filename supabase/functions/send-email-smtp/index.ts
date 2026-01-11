import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
}

interface Attachment {
  filename: string;
  content: string;
  contentType: string;
}

interface EmailRequest {
  centro_id?: string;
  to: string | string[];
  subject: string;
  html: string;
  from_name_override?: string;
  attachments?: Attachment[];
  customer_id?: string;
  template_name?: string;
  metadata?: Record<string, any>;
  // Marketing-specific fields
  marketing?: boolean;
  unsubscribe_email?: string;
  unsubscribe_url?: string;
  lead_id?: string;
  smtp_config?: SmtpConfig;
}

// Generate a unique Message-ID
const generateMessageId = (domain: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}.${random}@${domain}>`;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email-smtp: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      centro_id, 
      to, 
      subject, 
      html, 
      from_name_override, 
      attachments, 
      customer_id, 
      template_name, 
      metadata,
      marketing,
      unsubscribe_email,
      unsubscribe_url,
      lead_id,
      smtp_config: requestSmtpConfig
    }: EmailRequest = await req.json();
    
    console.log("send-email-smtp: Raw 'to' value received:", JSON.stringify(to));
    console.log("send-email-smtp: Sending email to", to, marketing ? "(marketing)" : "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Centro settings to get SMTP config (for non-marketing emails)
    let smtpConfig: SmtpConfig | null = requestSmtpConfig || null;
    let centroName = "LabLinkRiparo";

    if (centro_id && !smtpConfig) {
      const { data: centro, error } = await supabase
        .from("centri_assistenza")
        .select("business_name, settings")
        .eq("id", centro_id)
        .single();

      if (!error && centro) {
        centroName = centro.business_name || "LabLinkRiparo";
        const settings = centro.settings as { smtp_config?: SmtpConfig } | null;
        if (settings?.smtp_config?.enabled && settings.smtp_config.host) {
          smtpConfig = settings.smtp_config;
          console.log("send-email-smtp: Using Centro SMTP config for", centroName);
        }
      }
    }

    const fromName = from_name_override || smtpConfig?.from_name || centroName;
    
    // Normalize recipients - ensure they are valid email strings
    const normalizeEmail = (email: string): string => {
      if (!email) return '';
      const trimmed = email.trim();
      // Check if already in "Name <email>" format
      if (trimmed.includes('<') && trimmed.includes('>')) {
        return trimmed;
      }
      // Just return the email
      return trimmed;
    };
    
    const rawRecipients = Array.isArray(to) ? to : [to];
    const recipients = rawRecipients
      .map(normalizeEmail)
      .filter(email => email && email.includes('@'));
    
    if (recipients.length === 0) {
      throw new Error("No valid email recipients provided");
    }
    
    const fromEmail = smtpConfig?.from_email || "noreply@linkriparo.it";
    const domain = fromEmail.split("@")[1] || "linkriparo.it";

    // Helper function to log communication
    const logCommunication = async (status: string) => {
      if (customer_id && centro_id) {
        try {
          await supabase.from("customer_communications").insert({
            customer_id,
            centro_id,
            type: "email",
            subject,
            content: html.substring(0, 5000),
            template_name: template_name || null,
            status,
            metadata: metadata || {},
          });
        } catch (logError) {
          console.error("send-email-smtp: Failed to log communication:", logError);
        }
      }
    };

    // Clean subject - remove emojis and normalize
    const cleanSubject = subject
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .trim();

    // Build anti-spam headers for marketing emails
    const antiSpamHeaders: Record<string, string> = {};
    if (marketing && unsubscribe_url) {
      antiSpamHeaders['List-Unsubscribe'] = `<${unsubscribe_url}>`;
      antiSpamHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    antiSpamHeaders['X-Mailer'] = 'LinkRiparo Marketing v1.0';
    antiSpamHeaders['Message-ID'] = generateMessageId(domain);
    if (marketing) {
      antiSpamHeaders['Precedence'] = 'bulk';
    }

    // Try SMTP if configured
    if (smtpConfig && smtpConfig.host) {
      try {
        const trimmedHost = smtpConfig.host?.trim() || '';
        const trimmedUser = smtpConfig.user?.trim() || '';
        const trimmedFromEmail = smtpConfig.from_email?.trim() || fromEmail;
        
        console.log("send-email-smtp: Connecting to SMTP", trimmedHost, smtpConfig.port);
        
        const client = new SMTPClient({
          connection: {
            hostname: trimmedHost,
            port: smtpConfig.port,
            tls: smtpConfig.secure,
            auth: {
              username: trimmedUser,
              password: smtpConfig.password,
            },
          },
        });

        // Generate plain text version from HTML
        const plainText = html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        await client.send({
          from: `${fromName} <${trimmedFromEmail}>`,
          to: recipients,
          subject: cleanSubject,
          content: plainText,
          html: html,
          headers: antiSpamHeaders,
        });

        await client.close();

        console.log("send-email-smtp: Email sent via SMTP");
        
        await logCommunication("sent");
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            method: "smtp",
            from: `${fromName} <${trimmedFromEmail}>`,
            to: recipients,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smtpError: any) {
        console.error("send-email-smtp: SMTP error:", smtpError.message);
        // Fallback to Resend for all emails when SMTP fails
        console.log("send-email-smtp: SMTP failed, falling back to Resend");
      }
    }

    // Fallback to Resend only if no SMTP config or non-marketing fallback
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("No SMTP config and RESEND_API_KEY not configured");
    }

    console.log("send-email-smtp: Using Resend fallback");

    const resendBody: any = {
      from: `${fromName} <onboarding@resend.dev>`,
      to: recipients,
      subject: cleanSubject,
      html: html,
    };

    // Add headers for Resend
    if (Object.keys(antiSpamHeaders).length > 0) {
      resendBody.headers = antiSpamHeaders;
    }

    if (attachments?.length) {
      resendBody.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      }));
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("send-email-smtp: Resend error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email via Resend");
    }

    console.log("send-email-smtp: Email sent via Resend:", emailResult.id);
    
    await logCommunication("sent");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        method: "resend",
        emailId: emailResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("send-email-smtp: Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
