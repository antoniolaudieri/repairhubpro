import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScanZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  search_keywords: string[];
  total_leads_found: number;
}

interface PhoneShop {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  distance?: number;
  shopType: string;
}

// Email validation function - same as marketing-lead-finder
const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return false;
  
  // Block invalid/generic emails
  const blockedDomains = [
    'example.com', 'test.com', 'demo.com', 'sample.com',
    'noreply.com', 'no-reply.com', 'donotreply.com',
    'mailinator.com', 'tempmail.com', 'guerrillamail.com'
  ];
  const domain = trimmed.split('@')[1];
  if (blockedDomains.includes(domain)) return false;
  
  const blockedPrefixes = [
    'info@', 'support@', 'admin@', 'webmaster@', 'postmaster@',
    'noreply@', 'no-reply@', 'donotreply@', 'do-not-reply@',
    'sales@', 'contact@', 'hello@', 'help@', 'abuse@',
    'privacy@', 'security@', 'legal@', 'marketing@'
  ];
  if (blockedPrefixes.some(prefix => trimmed.startsWith(prefix))) return false;
  
  return true;
};

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-auto-scanner: Starting automatic scan");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if automation is enabled
    const { data: settings } = await supabase
      .from("marketing_automation_settings")
      .select("*")
      .single();

    if (!settings?.is_enabled || !settings?.auto_scan_enabled) {
      console.log("marketing-auto-scanner: Automation disabled, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Automation disabled", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get zones that need scanning
    const { data: zones, error: zonesError } = await supabase
      .from("marketing_scan_zones")
      .select("*")
      .eq("is_active", true)
      .or(`next_scan_at.is.null,next_scan_at.lte.${new Date().toISOString()}`);

    if (zonesError) throw zonesError;

    if (!zones || zones.length === 0) {
      console.log("marketing-auto-scanner: No zones to scan");
      return new Response(
        JSON.stringify({ success: true, message: "No zones to scan", scanned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`marketing-auto-scanner: Found ${zones.length} zones to scan`);

    let totalNewLeads = 0;
    const results: { zone: string; leads: number }[] = [];

    // Get default funnel stage (first stage)
    const { data: defaultStage } = await supabase
      .from("marketing_funnel_stages")
      .select("id")
      .eq("stage_order", 1)
      .single();

    // Get appropriate email sequence
    const { data: centroSequence } = await supabase
      .from("marketing_email_sequences")
      .select("id")
      .eq("target_type", "centro")
      .eq("is_active", true)
      .single();

    for (const zone of zones as ScanZone[]) {
      try {
        console.log(`marketing-auto-scanner: Scanning zone "${zone.name}"`);

        // Call Overpass API to find shops - use simpler query
        const radiusMeters = Math.min(zone.radius_km * 1000, 15000); // Max 15km to avoid timeout
        const overpassQuery = `[out:json][timeout:25];
(
  nwr["shop"~"mobile_phone|electronics|computer"](around:${radiusMeters},${zone.latitude},${zone.longitude});
  nwr["craft"="electronics_repair"](around:${radiusMeters},${zone.latitude},${zone.longitude});
);
out center;`;

        console.log(`marketing-auto-scanner: Querying Overpass for ${zone.name} - radius: ${radiusMeters}m`);

        // Try multiple Overpass servers
        const overpassServers = [
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass-api.de/api/interpreter',
          'https://z.overpass-api.de/api/interpreter'
        ];

        let overpassData = null;
        
        for (const server of overpassServers) {
          try {
            console.log(`marketing-auto-scanner: Trying server ${server}`);
            
            const overpassResponse = await fetch(server, {
              method: 'POST',
              body: `data=${encodeURIComponent(overpassQuery)}`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            if (overpassResponse.ok) {
              const responseText = await overpassResponse.text();
              overpassData = JSON.parse(responseText);
              console.log(`marketing-auto-scanner: Success with server ${server}`);
              break;
            } else {
              console.log(`marketing-auto-scanner: Server ${server} returned ${overpassResponse.status}`);
            }
          } catch (serverError) {
            console.log(`marketing-auto-scanner: Server ${server} failed: ${serverError}`);
          }
        }

        if (!overpassData) {
          console.error(`marketing-auto-scanner: All Overpass servers failed for zone ${zone.name}`);
          continue;
        }

        const elements = overpassData.elements || [];
        
        console.log(`marketing-auto-scanner: Found ${elements.length} shops in zone "${zone.name}"`);
        
        if (elements.length === 0) {
          console.log(`marketing-auto-scanner: No shops found - trying broader search...`);
          
          // Try a broader search with any shop tag
          const broadQuery = `[out:json][timeout:25];
node["shop"](around:${radiusMeters},${zone.latitude},${zone.longitude});
out;`;
          
          try {
            const broadResponse = await fetch(overpassServers[0], {
              method: 'POST',
              body: `data=${encodeURIComponent(broadQuery)}`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
            
            if (broadResponse.ok) {
              const broadData = await broadResponse.json();
              // Filter for relevant shops
              const relevantShops = (broadData.elements || []).filter((el: any) => {
                const shop = el.tags?.shop || '';
                return ['mobile_phone', 'electronics', 'computer', 'telecommunication', 'hifi', 'appliance'].includes(shop);
              });
              console.log(`marketing-auto-scanner: Broad search found ${relevantShops.length} relevant shops`);
              if (relevantShops.length > 0) {
                overpassData.elements = relevantShops;
              }
            }
          } catch (broadError) {
            console.log(`marketing-auto-scanner: Broad search failed: ${broadError}`);
          }
        }

        let zoneNewLeads = 0;

        for (const el of elements) {
          if (!el.tags?.name) continue;

          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          
          // Build address
          const addressParts = [
            el.tags['addr:street'],
            el.tags['addr:housenumber'],
            el.tags['addr:city'],
            el.tags['addr:postcode']
          ].filter(Boolean);
          const address = addressParts.length > 0 ? addressParts.join(', ') : el.tags['addr:full'] || 'Indirizzo non disponibile';

          // Check if lead already exists (by name and approximate location)
          const { data: existingLeads } = await supabase
            .from("marketing_leads")
            .select("id")
            .ilike("business_name", el.tags.name)
            .gte("latitude", lat - 0.001)
            .lte("latitude", lat + 0.001)
            .gte("longitude", lon - 0.001)
            .lte("longitude", lon + 0.001);

          if (existingLeads && existingLeads.length > 0) {
            console.log(`marketing-auto-scanner: Lead "${el.tags.name}" already exists, skipping`);
            continue;
          }

          // CRITICAL: Validate email BEFORE saving - don't waste resources on leads without valid email
          const rawEmail = el.tags.email || el.tags['contact:email'] || null;
          const email = rawEmail ? rawEmail.trim().toLowerCase() : null;
          
          if (!email || !isValidEmail(email)) {
            console.log(`marketing-auto-scanner: Skipping "${el.tags.name}" - no valid email (${email || 'null'})`);
            continue;
          }

          // Determine business type
          let businessType = 'telefonia';
          const shop = el.tags?.shop || el.tags?.craft || '';
          if (shop === 'electronics' || shop === 'electronics_repair') businessType = 'elettronica';
          else if (shop === 'computer') businessType = 'computer';

          // Create new lead - only with validated email
          const { data: newLead, error: leadError } = await supabase
            .from("marketing_leads")
            .insert({
              source: 'auto_scan',
              business_name: el.tags.name,
              address: address,
              latitude: lat,
              longitude: lon,
              phone: el.tags.phone || el.tags['contact:phone'] || null,
              email: email, // Using validated email
              website: el.tags.website || el.tags['contact:website'] || null,
              business_type: businessType,
              status: 'new',
              auto_processed: true,
              scan_zone_id: zone.id,
              funnel_stage_id: defaultStage?.id || null,
              current_sequence_id: centroSequence?.id || null,
              current_step: 0,
              sequence_started_at: centroSequence?.id ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (leadError) {
            console.error(`marketing-auto-scanner: Error creating lead:`, leadError);
            continue;
          }

          zoneNewLeads++;
          totalNewLeads++;

          // Schedule first email - email is guaranteed to exist now
          if (centroSequence?.id && newLead) {
            const { data: firstStep } = await supabase
              .from("marketing_sequence_steps")
              .select("*")
              .eq("sequence_id", centroSequence.id)
              .eq("step_number", 1)
              .single();

            if (firstStep) {
              const scheduledFor = new Date();
              scheduledFor.setHours(scheduledFor.getHours() + firstStep.delay_hours);
              scheduledFor.setDate(scheduledFor.getDate() + firstStep.delay_days);

              await supabase
                .from("marketing_email_queue")
                .insert({
                  lead_id: newLead.id,
                  template_id: firstStep.template_id,
                  sequence_id: centroSequence.id,
                  step_number: 1,
                  scheduled_for: scheduledFor.toISOString(),
                  status: 'pending',
                });
              
              console.log(`marketing-auto-scanner: Scheduled first email for "${el.tags.name}" (${email})`);
            }
          }

          console.log(`marketing-auto-scanner: Created lead "${el.tags.name}" with email ${email}`);
        }

        // Update zone scan stats
        await supabase
          .from("marketing_scan_zones")
          .update({
            last_scanned_at: new Date().toISOString(),
            total_leads_found: zone.total_leads_found + zoneNewLeads,
          })
          .eq("id", zone.id);

        results.push({ zone: zone.name, leads: zoneNewLeads });

        // Log the scan
        await supabase
          .from("marketing_automation_logs")
          .insert({
            log_type: 'scan',
            message: `Scansione zona "${zone.name}" completata: ${zoneNewLeads} nuovi lead trovati`,
            details: { zone_id: zone.id, elements_found: elements.length, new_leads: zoneNewLeads },
            zone_id: zone.id,
          });

      } catch (zoneError) {
        console.error(`marketing-auto-scanner: Error scanning zone ${zone.name}:`, zoneError);
        
        await supabase
          .from("marketing_automation_logs")
          .insert({
            log_type: 'error',
            message: `Errore scansione zona "${zone.name}": ${zoneError instanceof Error ? zoneError.message : 'Unknown error'}`,
            details: { zone_id: zone.id, error: String(zoneError) },
            zone_id: zone.id,
          });
      }
    }

    console.log(`marketing-auto-scanner: Completed. Total new leads: ${totalNewLeads}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        scanned: zones.length, 
        newLeads: totalNewLeads,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("marketing-auto-scanner: Error:", error);
    
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'error',
        message: `Errore generale scanner: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: String(error) },
      });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
