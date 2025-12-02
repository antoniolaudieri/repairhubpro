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
      .select("id")
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

    // Get repairs for these devices
    const { data: repairs, error: repairsError } = await supabase
      .from("repairs")
      .select(`
        id,
        status,
        final_cost,
        estimated_cost,
        created_at,
        device:devices (
          brand,
          model,
          device_type,
          reported_issue
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

    console.log(`Found ${repairs?.length || 0} repairs`);

    return new Response(
      JSON.stringify({ repairs: repairs || [] }),
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
