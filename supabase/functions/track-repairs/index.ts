import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      console.log("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching repairs for email: ${email}`);

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find customer by email
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone")
      .eq("email", email)
      .maybeSingle();

    if (customerError) {
      console.error("Error finding customer:", customerError);
      return new Response(
        JSON.stringify({ error: "Error finding customer" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      console.log("No customer found with this email");
      return new Response(
        JSON.stringify({ repairs: [], message: "No customer found" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found customer: ${customer.id}`);

    // Get devices for this customer
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("id")
      .eq("customer_id", customer.id);

    if (devicesError) {
      console.error("Error finding devices:", devicesError);
      return new Response(
        JSON.stringify({ error: "Error finding devices" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!devices || devices.length === 0) {
      console.log("No devices found for customer");
      return new Response(
        JSON.stringify({ repairs: [], message: "No devices found" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceIds = devices.map((d) => d.id);
    console.log(`Found ${deviceIds.length} devices`);

    // Get repairs for these devices with full details
    const { data: repairs, error: repairsError } = await supabase
      .from("repairs")
      .select(`
        id,
        status,
        priority,
        final_cost,
        estimated_cost,
        diagnosis,
        repair_notes,
        created_at,
        started_at,
        completed_at,
        delivered_at,
        device:devices (
          brand,
          model,
          device_type,
          reported_issue,
          photo_url,
          initial_condition
        )
      `)
      .in("device_id", deviceIds)
      .order("created_at", { ascending: false });

    if (repairsError) {
      console.error("Error finding repairs:", repairsError);
      return new Response(
        JSON.stringify({ error: "Error finding repairs" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get orders for these repairs (without prices)
    const repairIds = repairs?.map(r => r.id) || [];
    let ordersMap: Record<string, any> = {};
    
    if (repairIds.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, repair_id, tracking_number")
        .in("repair_id", repairIds);

      if (orders) {
        orders.forEach(order => {
          if (order.repair_id) {
            ordersMap[order.repair_id] = {
              status: order.status,
              tracking_number: order.tracking_number
            };
          }
        });
      }
    }

    // Attach order info to repairs
    const repairsWithOrders = repairs?.map(repair => ({
      ...repair,
      order: ordersMap[repair.id] || null
    })) || [];

    console.log(`Found ${repairsWithOrders.length} repairs`);

    return new Response(
      JSON.stringify({ repairs: repairsWithOrders, customer: { name: customer.name } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
