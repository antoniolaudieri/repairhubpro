import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepairRequest {
  id: string;
  customer_latitude: number | null;
  customer_longitude: number | null;
  service_type: string;
  corner_id: string | null;
}

interface Provider {
  id: string;
  type: "riparatore" | "centro";
  latitude: number;
  longitude: number;
  service_radius_km?: number;
  distance_km?: number;
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { repair_request_id, action } = await req.json();
    console.log(`[dispatch-repair] Action: ${action}, Request ID: ${repair_request_id}`);

    if (action === "dispatch") {
      // Get repair request details
      const { data: request, error: requestError } = await supabase
        .from("repair_requests")
        .select("*")
        .eq("id", repair_request_id)
        .single();

      if (requestError || !request) {
        console.error("[dispatch-repair] Request not found:", requestError);
        return new Response(
          JSON.stringify({ error: "Repair request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get corner location if request is from a corner
      let customerLat = request.customer_latitude;
      let customerLon = request.customer_longitude;

      if (request.corner_id && (!customerLat || !customerLon)) {
        const { data: corner } = await supabase
          .from("corners")
          .select("latitude, longitude")
          .eq("id", request.corner_id)
          .single();

        if (corner) {
          customerLat = corner.latitude;
          customerLon = corner.longitude;
        }
      }

      console.log(`[dispatch-repair] Customer location: ${customerLat}, ${customerLon}`);

      // Find nearby approved riparatori
      const { data: riparatori } = await supabase
        .from("riparatori")
        .select("id, latitude, longitude, service_radius_km")
        .eq("status", "approved");

      // Find nearby approved centri
      const { data: centri } = await supabase
        .from("centri_assistenza")
        .select("id, latitude, longitude")
        .eq("status", "approved");

      const providers: Provider[] = [];

      // Filter riparatori by distance
      if (riparatori) {
        for (const r of riparatori) {
          if (r.latitude && r.longitude && customerLat && customerLon) {
            const distance = calculateDistance(customerLat, customerLon, r.latitude, r.longitude);
            if (distance <= (r.service_radius_km || 15)) {
              providers.push({
                id: r.id,
                type: "riparatore",
                latitude: r.latitude,
                longitude: r.longitude,
                service_radius_km: r.service_radius_km,
                distance_km: distance,
              });
            }
          }
        }
      }

      // Filter centri by distance (default 25km radius for centri)
      if (centri) {
        for (const c of centri) {
          if (c.latitude && c.longitude && customerLat && customerLon) {
            const distance = calculateDistance(customerLat, customerLon, c.latitude, c.longitude);
            if (distance <= 25) {
              providers.push({
                id: c.id,
                type: "centro",
                latitude: c.latitude,
                longitude: c.longitude,
                distance_km: distance,
              });
            }
          }
        }
      }

      // Sort by distance
      providers.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
      console.log(`[dispatch-repair] Found ${providers.length} nearby providers`);

      if (providers.length === 0) {
        // No providers found, update status
        await supabase
          .from("repair_requests")
          .update({ status: "no_providers" })
          .eq("id", repair_request_id);

        return new Response(
          JSON.stringify({ success: false, message: "No nearby providers found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create job offers with 15-minute expiration
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const jobOffers = providers.map((p) => ({
        repair_request_id,
        provider_id: p.id,
        provider_type: p.type,
        distance_km: p.distance_km,
        expires_at: expiresAt,
        status: "pending",
      }));

      const { error: offersError } = await supabase.from("job_offers").insert(jobOffers);

      if (offersError) {
        console.error("[dispatch-repair] Error creating offers:", offersError);
        throw offersError;
      }

      // Update repair request status to dispatched
      await supabase
        .from("repair_requests")
        .update({ status: "dispatched", expires_at: expiresAt })
        .eq("id", repair_request_id);

      console.log(`[dispatch-repair] Created ${jobOffers.length} job offers`);

      return new Response(
        JSON.stringify({
          success: true,
          offers_created: jobOffers.length,
          expires_at: expiresAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accept") {
      const { job_offer_id, provider_id, provider_type } = await req.json();
      console.log(`[dispatch-repair] Accepting offer ${job_offer_id} by ${provider_type} ${provider_id}`);

      // Get the job offer
      const { data: offer, error: offerError } = await supabase
        .from("job_offers")
        .select("*, repair_requests(*)")
        .eq("id", job_offer_id)
        .single();

      if (offerError || !offer) {
        return new Response(
          JSON.stringify({ error: "Job offer not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if offer is still valid
      if (new Date(offer.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Job offer has expired" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already assigned
      if (offer.repair_requests?.assigned_provider_id) {
        return new Response(
          JSON.stringify({ error: "Job already assigned to another provider" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Accept this offer
      await supabase
        .from("job_offers")
        .update({ status: "accepted", response_at: new Date().toISOString() })
        .eq("id", job_offer_id);

      // Expire all other offers for this request
      await supabase
        .from("job_offers")
        .update({ status: "expired" })
        .eq("repair_request_id", offer.repair_request_id)
        .neq("id", job_offer_id);

      // Update repair request with assigned provider
      await supabase
        .from("repair_requests")
        .update({
          status: "assigned",
          assigned_provider_id: provider_id,
          assigned_provider_type: provider_type,
          assigned_at: new Date().toISOString(),
        })
        .eq("id", offer.repair_request_id);

      console.log(`[dispatch-repair] Job ${offer.repair_request_id} assigned to ${provider_type} ${provider_id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Job accepted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "decline") {
      const { job_offer_id } = await req.json();
      console.log(`[dispatch-repair] Declining offer ${job_offer_id}`);

      await supabase
        .from("job_offers")
        .update({ status: "declined", response_at: new Date().toISOString() })
        .eq("id", job_offer_id);

      return new Response(
        JSON.stringify({ success: true, message: "Job declined" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "expire_old") {
      // Expire all pending offers that have passed their expiration time
      const { data: expired, error } = await supabase
        .from("job_offers")
        .update({ status: "expired" })
        .eq("status", "pending")
        .lt("expires_at", new Date().toISOString())
        .select();

      console.log(`[dispatch-repair] Expired ${expired?.length || 0} old offers`);

      return new Response(
        JSON.stringify({ success: true, expired_count: expired?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[dispatch-repair] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
