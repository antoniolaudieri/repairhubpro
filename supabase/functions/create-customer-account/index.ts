import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, fullName, phone, centroId, centroName } = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Email and full name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const defaultPassword = '12345678';

    // Create user with default password
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
      },
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign customer role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'customer',
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(
        JSON.stringify({ error: 'User created but role assignment failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email via send-email-smtp edge function (uses Centro SMTP if configured)
    const appUrl = supabaseUrl?.replace('.supabase.co', '.lovable.app') || 'https://lablinkriparo.it';
    const shopName = centroName || 'LabLinkRiparo';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">${shopName}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Gestionale Riparazioni</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 22px;">Benvenuto ${fullName}!</h2>
              
              <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                È stato creato un account per te su <strong>${shopName}</strong>. 
                Con questo account potrai seguire lo stato delle tue riparazioni direttamente online, 
                in totale trasparenza.
              </p>
              
              <!-- Credentials Box -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">I tuoi dati di accesso</h3>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe;">
                      <span style="color: #64748b; font-size: 13px;">Email:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e0f2fe; text-align: right;">
                      <strong style="color: #0c4a6e; font-size: 14px;">${email}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #64748b; font-size: 13px;">Password:</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right;">
                      <strong style="color: #0c4a6e; font-size: 14px; font-family: monospace; background: #e0f2fe; padding: 4px 8px; border-radius: 4px;">${defaultPassword}</strong>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; font-size: 13px; margin: 0 0 24px 0; padding: 12px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                ⚠️ Ti consigliamo di cambiare la password al primo accesso per maggiore sicurezza.
              </p>
              
              <!-- Features -->
              <h3 style="color: #18181b; margin: 0 0 16px 0; font-size: 16px;">Cosa puoi fare con il tuo account:</h3>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background: #dbeafe; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">📱</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #18181b; font-size: 14px;">Segui le tue riparazioni</strong>
                          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Monitora lo stato delle riparazioni in tempo reale</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background: #dcfce7; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">✅</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #18181b; font-size: 14px;">Accetta preventivi online</strong>
                          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Visualizza e firma preventivi direttamente dal tuo dispositivo</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="8"></td></tr>
                <tr>
                  <td style="padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width: 32px; height: 32px; background: #fef3c7; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">🔄</div>
                        </td>
                        <td style="padding-left: 12px;">
                          <strong style="color: #18181b; font-size: 14px;">Scopri dispositivi usati e ricondizionati</strong>
                          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Sfoglia il catalogo di dispositivi usati verificati e garantiti</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Privacy Notice -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="color: #166534; font-size: 13px; margin: 0; line-height: 1.5;">
                  <strong>✓ Consenso privacy:</strong> Creando questo account hai acconsentito al trattamento dei tuoi dati 
                  per la gestione delle riparazioni e la comunicazione dello stato dei lavori, come da informativa 
                  privacy firmata al momento del ritiro del dispositivo (Art. 13 Reg. UE 2016/679 - GDPR).
                </p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                      Accedi al tuo account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0;">
                Questa email è stata inviata automaticamente da ${shopName}.
              </p>
              <p style="color: #a1a1aa; font-size: 11px; margin: 0;">
                © ${new Date().getFullYear()} ${shopName} - Gestionale Riparazioni
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      // Call send-email-smtp edge function
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          centro_id: centroId,
          to: email,
          subject: `Benvenuto su ${shopName} - I tuoi dati di accesso`,
          html: emailHtml,
        }),
      });

      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        console.log('Welcome email sent via', emailResult.method, 'to:', email);
      } else {
        console.error('Email send failed:', emailResult.error);
      }
    } catch (emailError: any) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the request if email fails - account was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userData.user.id,
        message: 'Customer account created with default password: 12345678' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
