import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  device_id: string;
}

interface UsedDevice {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  price: number;
  condition: string;
  storage_capacity: string | null;
  photos: string[] | null;
  centro_id: string;
}

interface DeviceInterest {
  id: string;
  email: string;
  customer_id: string | null;
  device_types: string[] | null;
  brands: string[] | null;
  max_price: number | null;
  notify_enabled: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-device-interest: Request received");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { device_id }: NotifyRequest = await req.json();
    console.log("notify-device-interest: Processing device", device_id);

    // Fetch the published device
    const { data: device, error: deviceError } = await supabase
      .from("used_devices")
      .select("*")
      .eq("id", device_id)
      .single();

    if (deviceError || !device) {
      console.error("notify-device-interest: Device not found", deviceError);
      return new Response(
        JSON.stringify({ error: "Device not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("notify-device-interest: Device found", device.brand, device.model);

    // Fetch all interested customers with matching preferences
    const { data: interests, error: interestsError } = await supabase
      .from("used_device_interests")
      .select("*")
      .eq("notify_enabled", true);

    if (interestsError) {
      console.error("notify-device-interest: Error fetching interests", interestsError);
      throw interestsError;
    }

    console.log("notify-device-interest: Found", interests?.length || 0, "potential interests");

    // Filter matching interests
    const matchingInterests = (interests || []).filter((interest: DeviceInterest) => {
      // Check device type match (if specified)
      if (interest.device_types && interest.device_types.length > 0) {
        if (!interest.device_types.includes(device.device_type)) {
          return false;
        }
      }

      // Check brand match (if specified)
      if (interest.brands && interest.brands.length > 0) {
        if (!interest.brands.includes(device.brand)) {
          return false;
        }
      }

      // Check max price (if specified)
      if (interest.max_price && device.price > interest.max_price) {
        return false;
      }

      return true;
    });

    console.log("notify-device-interest: Matching interests", matchingInterests.length);

    const results = {
      emails_sent: 0,
      notifications_created: 0,
      errors: [] as string[],
    };

    // Get Centro info for email
    const { data: centro } = await supabase
      .from("centri_assistenza")
      .select("business_name")
      .eq("id", device.centro_id)
      .single();

    const centroName = centro?.business_name || "TechRepair";

    // Process each matching interest
    for (const interest of matchingInterests) {
      try {
        // Send email notification
        const conditionLabels: Record<string, string> = {
          ricondizionato: "Ricondizionato",
          usato_ottimo: "Usato Ottimo",
          usato_buono: "Usato Buono",
          usato_discreto: "Usato Discreto",
          alienato: "Alienato",
        };

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nuovo Dispositivo Disponibile!</h1>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                  Ciao! Abbiamo un nuovo dispositivo che corrisponde alle tue preferenze:
                </p>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">
                    ${device.brand} ${device.model}
                  </h2>
                  ${device.storage_capacity ? `<p style="margin: 5px 0; color: #6b7280;">Memoria: ${device.storage_capacity}</p>` : ''}
                  <p style="margin: 5px 0; color: #6b7280;">Condizione: ${conditionLabels[device.condition] || device.condition}</p>
                  <p style="margin: 15px 0 0 0; font-size: 28px; font-weight: bold; color: #6366f1;">
                    €${device.price.toFixed(2)}
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/usato/${device.id}" 
                     style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Visualizza Dispositivo
                  </a>
                </div>
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
                  Ricevi questa email perché hai attivato le notifiche per dispositivi usati su ${centroName}.
                  <br>Puoi modificare le tue preferenze nella dashboard cliente.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const emailResponse = await resend.emails.send({
          from: `${centroName} <onboarding@resend.dev>`,
          to: [interest.email],
          subject: `🎉 Nuovo ${device.brand} ${device.model} disponibile!`,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error("notify-device-interest: Email error for", interest.email, emailResponse.error);
          results.errors.push(`Email to ${interest.email}: ${emailResponse.error.message}`);
        } else {
          console.log("notify-device-interest: Email sent to", interest.email);
          results.emails_sent++;
        }

        // Update last_notified_at
        await supabase
          .from("used_device_interests")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", interest.id);

        // Create in-app notification if customer has an account
        if (interest.customer_id) {
          // Get customer email for notification lookup
          const { data: customer } = await supabase
            .from("customers")
            .select("email")
            .eq("id", interest.customer_id)
            .single();

          if (customer?.email) {
            // Insert into a customer_notifications table or similar
            // For now, we'll use a simple approach with a dedicated table
            const { error: notifError } = await supabase
              .from("customer_notifications")
              .insert({
                customer_email: customer.email,
                type: "new_device",
                title: `Nuovo ${device.brand} ${device.model} disponibile!`,
                message: `Un dispositivo che corrisponde alle tue preferenze è ora disponibile a €${device.price.toFixed(2)}`,
                data: {
                  device_id: device.id,
                  device_type: device.device_type,
                  brand: device.brand,
                  model: device.model,
                  price: device.price,
                },
                read: false,
              });

            if (!notifError) {
              results.notifications_created++;
              console.log("notify-device-interest: In-app notification created for", customer.email);
            } else {
              console.error("notify-device-interest: Notification error", notifError);
            }
          }
        }
      } catch (error: any) {
        console.error("notify-device-interest: Error processing interest", interest.id, error);
        results.errors.push(`Interest ${interest.id}: ${error.message}`);
      }
    }

    console.log("notify-device-interest: Complete", results);

    return new Response(
      JSON.stringify({
        success: true,
        device_id,
        matching_interests: matchingInterests.length,
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("notify-device-interest: Error", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
