import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATUS_LABELS: Record<string, string> = {
  pending: "In Attesa ⏳",
  in_progress: "In Lavorazione 🔧",
  waiting_for_parts: "In Attesa Ricambi 📦",
  completed: "Pronta per il Ritiro ✅",
  delivered: "Consegnata 🎉",
  cancelled: "Annullata ❌",
  forfeited: "Alienata",
  quote_pending: "Preventivo in Attesa",
  diagnosed: "Diagnosticata",
};

function normalizePhone(phone: string): string[] {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const variants: string[] = [cleaned];
  
  // If starts with +39, also try without prefix
  if (cleaned.startsWith('+39')) {
    variants.push(cleaned.slice(3));
  }
  // If starts with 39 (no +), try with + and without prefix
  if (cleaned.startsWith('39') && cleaned.length > 10) {
    variants.push('+' + cleaned);
    variants.push(cleaned.slice(2));
  }
  // If no prefix, add +39 variant
  if (!cleaned.startsWith('+') && !cleaned.startsWith('39')) {
    variants.push('+39' + cleaned);
    variants.push('39' + cleaned);
  }
  
  return [...new Set(variants)];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, api_key } = await req.json();

    // Validate API key
    const validKey = Deno.env.get('WHATSAPP_BOT_API_KEY');
    if (!api_key || api_key !== validKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Search customer by phone variants
    const phoneVariants = normalizePhone(phone);
    console.log(`Searching customer for phone variants:`, phoneVariants);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, email, phone, address, notes, created_at")
      .in("phone", phoneVariants)
      .maybeSingle();

    if (customerError) {
      console.error("Customer query error:", customerError);
      return new Response(
        JSON.stringify({ error: "Errore nella ricerca del cliente" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customer) {
      return new Response(
        JSON.stringify({ 
          found: false, 
          message: "Nessun cliente trovato con questo numero di telefono" 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get devices for this customer
    const { data: devices } = await supabase
      .from("devices")
      .select("id")
      .eq("customer_id", customer.id);

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({
          found: true,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            registered_since: customer.created_at?.split('T')[0] || null,
          },
          repairs: [],
          total_repairs: 0,
          message: "Cliente trovato ma nessun dispositivo registrato"
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deviceIds = devices.map(d => d.id);

    // Get repairs with device details
    const { data: repairs } = await supabase
      .from("repairs")
      .select(`
        id, status, priority, estimated_cost, final_cost,
        diagnosis, repair_notes, created_at, started_at, completed_at, delivered_at,
        device:devices (brand, model, device_type, reported_issue)
      `)
      .in("device_id", deviceIds)
      .order("created_at", { ascending: false });

    // Get orders for tracking info
    const repairIds = repairs?.map(r => r.id) || [];
    let ordersMap: Record<string, { status: string; tracking_number: string | null }> = {};

    if (repairIds.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("status, repair_id, tracking_number")
        .in("repair_id", repairIds);

      if (orders) {
        orders.forEach(o => {
          if (o.repair_id) {
            ordersMap[o.repair_id] = { status: o.status, tracking_number: o.tracking_number };
          }
        });
      }
    }

    // Format response
    const formattedRepairs = (repairs || []).map(r => {
      const dev = r.device as any;
      const deviceName = dev ? `${dev.brand || ''} ${dev.model || ''}`.trim() : 'Dispositivo';
      return {
        id: r.id,
        device: deviceName,
        device_type: dev?.device_type || null,
        issue: dev?.reported_issue || null,
        status: r.status,
        status_label: STATUS_LABELS[r.status] || r.status,
        priority: r.priority,
        diagnosis: r.diagnosis,
        estimated_cost: r.estimated_cost,
        final_cost: r.final_cost,
        created_at: r.created_at?.split('T')[0] || null,
        started_at: r.started_at?.split('T')[0] || null,
        completed_at: r.completed_at?.split('T')[0] || null,
        delivered_at: r.delivered_at?.split('T')[0] || null,
        tracking: ordersMap[r.id]?.tracking_number || null,
        order_status: ordersMap[r.id]?.status || null,
      };
    });

    return new Response(
      JSON.stringify({
        found: true,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          registered_since: customer.created_at?.split('T')[0] || null,
        },
        repairs: formattedRepairs,
        total_repairs: formattedRepairs.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
