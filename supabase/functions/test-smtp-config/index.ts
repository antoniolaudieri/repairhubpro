import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestSmtpRequest {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_name: string;
  from_email: string;
  test_email: string; // Email to send test to
}

const handler = async (req: Request): Promise<Response> => {
  console.log("test-smtp-config: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawConfig: TestSmtpRequest = await req.json();
    
    // Trim all string inputs to remove whitespace
    const config = {
      host: rawConfig.host?.trim() || '',
      port: rawConfig.port,
      secure: rawConfig.secure,
      user: rawConfig.user?.trim() || '',
      password: rawConfig.password || '',
      from_name: rawConfig.from_name?.trim() || '',
      from_email: rawConfig.from_email?.trim() || '',
      test_email: rawConfig.test_email?.trim() || '',
    };
    
    console.log("test-smtp-config: Testing SMTP connection to", config.host, config.port);

    // Validate required fields
    if (!config.host || !config.port || !config.user || !config.password || !config.from_email || !config.test_email) {
      throw new Error("Campi obbligatori mancanti");
    }

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: config.port,
        tls: config.secure,
        auth: {
          username: config.user,
          password: config.password,
        },
      },
    });

    // Send test email
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Test SMTP Riuscito!</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              La configurazione SMTP del tuo Centro è funzionante.
            </p>
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">CONFIGURAZIONE:</p>
              <p style="margin: 4px 0; color: #374151; font-size: 14px;">
                <strong>Server:</strong> ${config.host}:${config.port}
              </p>
              <p style="margin: 4px 0; color: #374151; font-size: 14px;">
                <strong>Mittente:</strong> ${config.from_name} &lt;${config.from_email}&gt;
              </p>
              <p style="margin: 4px 0; color: #374151; font-size: 14px;">
                <strong>TLS:</strong> ${config.secure ? 'Attivo' : 'Disattivo'}
              </p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">
              D'ora in poi, tutte le email ai clienti verranno inviate da questo indirizzo.
            </p>
          </div>
          <div style="background-color: #f9fafb; padding: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              Email inviata tramite LabLinkRiparo
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.send({
      from: `${config.from_name || 'Test'} <${config.from_email}>`,
      to: [config.test_email],
      subject: "✅ Test Configurazione SMTP - LabLinkRiparo",
      content: "auto",
      html: testHtml,
    });

    await client.close();

    console.log("test-smtp-config: Test email sent successfully to", config.test_email);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email di test inviata con successo!",
        sent_to: config.test_email
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("test-smtp-config: Error:", error);
    
    // Provide user-friendly error messages
    let userMessage = error.message;
    if (error.message.includes("Authentication")) {
      userMessage = "Autenticazione fallita. Verifica email e password.";
    } else if (error.message.includes("Connection")) {
      userMessage = "Impossibile connettersi al server SMTP. Verifica host e porta.";
    } else if (error.message.includes("timeout")) {
      userMessage = "Timeout connessione. Il server potrebbe essere bloccato.";
    } else if (error.message.includes("TLS")) {
      userMessage = "Errore TLS. Prova a cambiare l'impostazione 'Connessione sicura'.";
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: userMessage,
        technical_error: error.message 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
