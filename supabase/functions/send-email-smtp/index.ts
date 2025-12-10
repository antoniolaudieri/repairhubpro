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

interface EmailRequest {
  centro_id: string;
  to: string | string[];
  subject: string;
  html: string;
  from_name_override?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-email-smtp: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { centro_id, to, subject, html, from_name_override }: EmailRequest = await req.json();
    
    console.log("send-email-smtp: Sending email to", to, "for centro", centro_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Centro settings to get SMTP config
    let smtpConfig: SmtpConfig | null = null;
    let centroName = "LabLinkRiparo";

    if (centro_id) {
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
    const recipients = Array.isArray(to) ? to : [to];

    // Try SMTP if configured
    if (smtpConfig) {
      try {
        // Trim whitespace from SMTP config values
        const trimmedHost = smtpConfig.host?.trim() || '';
        const trimmedUser = smtpConfig.user?.trim() || '';
        const trimmedFromEmail = smtpConfig.from_email?.trim() || '';
        
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

        await client.send({
          from: `${fromName} <${trimmedFromEmail}>`,
          to: recipients,
          subject: subject,
          content: "auto",
          html: html,
        });

        await client.close();

        console.log("send-email-smtp: Email sent via Centro SMTP");
        return new Response(
          JSON.stringify({ 
            success: true, 
            method: "smtp",
            from: `${fromName} <${trimmedFromEmail}>`,
            to: recipients 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smtpError: any) {
        console.error("send-email-smtp: SMTP error, falling back to Resend:", smtpError.message);
        // Fall through to Resend
      }
    }

    // Fallback to Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("No SMTP config and RESEND_API_KEY not configured");
    }

    console.log("send-email-smtp: Using Resend fallback");

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <onboarding@resend.dev>`,
        to: recipients,
        subject: subject,
        html: html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("send-email-smtp: Resend error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email via Resend");
    }

    console.log("send-email-smtp: Email sent via Resend:", emailResult.id);
    return new Response(
      JSON.stringify({ 
        success: true, 
        method: "resend",
        emailId: emailResult.id,
        from: `${fromName} <onboarding@resend.dev>`,
        to: recipients 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("send-email-smtp: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
