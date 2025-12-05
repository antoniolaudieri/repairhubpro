import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting forfeiture check...");

    // Get all completed repairs that are not delivered and not already forfeited
    const { data: repairs, error: fetchError } = await supabase
      .from("repairs")
      .select(`
        id,
        status,
        completed_at,
        forfeiture_warning_sent_at,
        forfeited_at,
        device_id,
        devices!inner (
          id,
          brand,
          model,
          device_type,
          imei,
          serial_number,
          initial_condition,
          customer_id,
          customers!inner (
            email,
            name,
            centro_id
          )
        )
      `)
      .eq("status", "completed")
      .is("delivered_at", null)
      .is("forfeited_at", null)
      .not("completed_at", "is", null);

    if (fetchError) {
      console.error("Error fetching repairs:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${repairs?.length || 0} completed repairs awaiting pickup`);

    const now = new Date();
    const results = {
      warnings_sent: 0,
      forfeited: 0,
      devices_added_to_inventory: 0,
      errors: [] as string[],
    };

    for (const repair of repairs || []) {
      const completedAt = new Date(repair.completed_at);
      const daysSinceCompletion = Math.floor(
        (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`Repair ${repair.id}: ${daysSinceCompletion} days since completion`);

      // Check if device should be forfeited (30+ days)
      if (daysSinceCompletion >= 30) {
        console.log(`Forfeiting repair ${repair.id}`);
        
        const { error: updateError } = await supabase
          .from("repairs")
          .update({
            status: "forfeited",
            forfeited_at: now.toISOString(),
          })
          .eq("id", repair.id);

        if (updateError) {
          console.error(`Error forfeiting repair ${repair.id}:`, updateError);
          results.errors.push(`Failed to forfeit repair ${repair.id}`);
        } else {
          results.forfeited++;
          console.log(`Successfully forfeited repair ${repair.id}`);
          
          // Add device to inventory as a sellable item
          const device = repair.devices as any;
          const centroId = device?.customers?.centro_id;
          
          const inventoryItem = {
            name: `${device.brand} ${device.model} (Alienato)`,
            category: "Dispositivi",
            brand: device.brand,
            model_compatibility: device.model,
            stock_quantity: 1,
            cost: 0, // No cost since it was forfeited
            selling_price: null, // To be set by Centro
            notes: `Dispositivo alienato - IMEI: ${device.imei || 'N/A'} - S/N: ${device.serial_number || 'N/A'} - Condizione: ${device.initial_condition || 'Non specificata'} - Da riparazione #${repair.id.slice(0, 8)}`,
            centro_id: centroId || null,
          };
          
          const { error: inventoryError } = await supabase
            .from("spare_parts")
            .insert(inventoryItem);
          
          if (inventoryError) {
            console.error(`Error adding device to inventory:`, inventoryError);
            results.errors.push(`Failed to add device ${repair.id} to inventory`);
          } else {
            results.devices_added_to_inventory++;
            console.log(`Successfully added device from repair ${repair.id} to inventory`);
          }
        }
      }
      // Check if warning should be sent (23+ days and warning not sent yet)
      else if (daysSinceCompletion >= 23 && !repair.forfeiture_warning_sent_at) {
        console.log(`Sending warning for repair ${repair.id}`);
        
        const { error: updateError } = await supabase
          .from("repairs")
          .update({
            forfeiture_warning_sent_at: now.toISOString(),
          })
          .eq("id", repair.id);

        if (updateError) {
          console.error(`Error sending warning for repair ${repair.id}:`, updateError);
          results.errors.push(`Failed to send warning for repair ${repair.id}`);
        } else {
          results.warnings_sent++;
          console.log(`Successfully sent warning for repair ${repair.id}`);
        }
      }
    }

    console.log("Forfeiture check completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Forfeiture check completed",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error in check-forfeiture function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
