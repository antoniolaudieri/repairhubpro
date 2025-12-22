import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { alert_id } = await req.json();
    
    if (!alert_id) {
      return new Response(
        JSON.stringify({ error: 'alert_id richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get alert with customer and centro info
    const { data: alert, error: alertError } = await supabase
      .from('device_health_alerts')
      .select(`
        *,
        customer:customers(name, email),
        centro:centri_assistenza(business_name, email, phone)
      `)
      .eq('id', alert_id)
      .single();
    
    if (alertError || !alert) {
      return new Response(
        JSON.stringify({ error: 'Alert non trovato' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!alert.customer?.email) {
      return new Response(
        JSON.stringify({ error: 'Email cliente non disponibile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Build email HTML
    const severityColors: Record<string, string> = {
      'critical': '#dc2626',
      'high': '#ea580c',
      'medium': '#ca8a04',
      'low': '#16a34a'
    };
    
    const severityEmoji: Record<string, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    
    const discountSection = alert.discount_offered > 0 ? `
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
        <p style="color: white; margin: 0; font-size: 14px;">OFFERTA ESCLUSIVA</p>
        <p style="color: white; margin: 10px 0; font-size: 28px; font-weight: bold;">${alert.discount_offered}% DI SCONTO</p>
        <p style="color: white; margin: 0; font-size: 14px;">sulla tua prossima diagnosi</p>
        ${alert.discount_code ? `<p style="background: white; color: #059669; padding: 10px 20px; border-radius: 6px; display: inline-block; margin-top: 15px; font-weight: bold; font-size: 18px;">Codice: ${alert.discount_code}</p>` : ''}
      </div>
    ` : '';
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, ${severityColors[alert.severity]}, ${severityColors[alert.severity]}dd); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${severityEmoji[alert.severity]} ${alert.title}</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Ciao <strong>${alert.customer.name}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          ${alert.message}
        </p>
        
        ${alert.recommended_action ? `
        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #0369a1; margin: 0; font-weight: 500;">
            💡 ${alert.recommended_action}
          </p>
        </div>
        ` : ''}
        
        ${discountSection}
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="mailto:${alert.centro.email}?subject=Richiesta%20diagnosi%20dispositivo" 
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Prenota Diagnosi
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Oppure contattaci al <a href="tel:${alert.centro.phone}" style="color: #3b82f6;">${alert.centro.phone}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          Questa email è stata inviata automaticamente dal sistema Device Health Monitor<br>
          di <strong>${alert.centro.business_name}</strong>
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
    `;
    
    // Send email via Resend
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email send');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${alert.centro.business_name} <noreply@resend.dev>`,
        to: [alert.customer.email],
        subject: `${severityEmoji[alert.severity]} ${alert.title}`,
        html: emailHtml
      })
    });
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }
    
    // Update alert status
    await supabase
      .from('device_health_alerts')
      .update({ 
        email_sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .eq('id', alert_id);
    
    // Log communication
    await supabase.from('customer_communications').insert({
      customer_id: alert.customer_id,
      centro_id: alert.centro_id,
      type: 'email',
      subject: alert.title,
      content: alert.message,
      template_name: 'device_health_alert',
      status: 'sent',
      metadata: { alert_id, severity: alert.severity }
    });
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send health alert email error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
