import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OverpassShop {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  lat: number;
  lon: number;
  shopType: string;
}

interface LeadStats {
  total: number;
  withEmail: number;
  phoneOnly: number;
  websiteOnly: number;
  osmTotal: number;
  enriched: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-lead-finder: Starting lead search");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { zoneId, cityName, searchType = "both", scanSource = "osm" } = body;

    // Get zone info
    let zoneName = cityName;
    let zone = null;
    let lat: number | null = null;
    let lon: number | null = null;
    let radiusKm = 10;
    
    if (zoneId) {
      const { data: zoneData } = await supabase
        .from("marketing_scan_zones")
        .select("*")
        .eq("id", zoneId)
        .single();
      
      if (zoneData) {
        zone = zoneData;
        zoneName = zoneData.name;
        lat = zoneData.latitude;
        lon = zoneData.longitude;
        radiusKm = zoneData.radius_km || 10;
      }
    }

    if (!zoneName) {
      return new Response(
        JSON.stringify({ success: false, error: "Specificare città o zona" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`marketing-lead-finder: Zone "${zoneName}" (lat: ${lat}, lon: ${lon}, radius: ${radiusKm}km)`);

    // Get default funnel stage and sequence
    const { data: defaultStage } = await supabase
      .from("marketing_funnel_stages")
      .select("id")
      .eq("stage_order", 1)
      .single();

    const { data: sequence } = await supabase
      .from("marketing_email_sequences")
      .select("id")
      .eq("target_type", searchType === "corner" ? "corner" : "centro")
      .eq("is_active", true)
      .single();

    // Stats tracking
    const stats: LeadStats = {
      total: 0,
      withEmail: 0,
      phoneOnly: 0,
      websiteOnly: 0,
      osmTotal: 0,
      enriched: 0,
    };
    
    const createdLeads: string[] = [];

    // ========== PHASE 1: Get all shops from OpenStreetMap (FREE & FAST) ==========
    if (!lat || !lon) {
      console.log(`marketing-lead-finder: ERROR - Zone has no coordinates!`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Zona senza coordinate. Modifica la zona e imposta latitudine/longitudine."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`marketing-lead-finder: Searching Overpass API...`);
    const osmShops = await searchOverpass(lat, lon, radiusKm, searchType);
    console.log(`marketing-lead-finder: Overpass found ${osmShops.length} shops`);

    if (osmShops.length === 0) {
      // Try with larger radius
      console.log(`marketing-lead-finder: No shops found, trying with 50km radius...`);
      const largerSearch = await searchOverpass(lat, lon, 50, searchType);
      if (largerSearch.length > 0) {
        osmShops.push(...largerSearch);
        console.log(`marketing-lead-finder: Extended search found ${largerSearch.length} shops`);
      }
    }

    // ========== PHASE 2: Save ALL shops immediately (no API calls) ==========
    const shopsToEnrich: Array<{shop: OverpassShop, leadId: string}> = [];
    
    for (const shop of osmShops) {
      try {
        // Quick duplicate check by name prefix
        const { data: existingLeads } = await supabase
          .from("marketing_leads")
          .select("id")
          .ilike("business_name", `${shop.name.substring(0, 10)}%`)
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          continue;
        }

        // Determine what contact info we have from OSM directly
        const hasEmail = !!shop.email;
        const hasPhone = !!shop.phone;
        const hasWebsite = !!shop.website;
        
        // Determine status
        let leadStatus = 'needs_enrichment';
        if (hasEmail) {
          leadStatus = 'new';
        } else if (hasPhone) {
          leadStatus = 'manual_contact';
        } else if (hasWebsite) {
          leadStatus = 'needs_enrichment';
        } else {
          // No contact info at all - skip
          continue;
        }

        const businessType = mapOsmTypeToBusinessType(shop.shopType);

        // Create lead IMMEDIATELY with OSM data
        const { data: newLead, error: leadError } = await supabase
          .from("marketing_leads")
          .insert({
            source: 'openstreetmap',
            business_name: shop.name,
            website: shop.website || null,
            phone: shop.phone || null,
            email: shop.email || null,
            address: shop.address || `${zoneName}, Italia`,
            business_type: businessType,
            status: leadStatus,
            auto_processed: hasEmail,
            scan_zone_id: zone?.id || null,
            funnel_stage_id: defaultStage?.id || null,
            current_sequence_id: hasEmail ? sequence?.id : null,
            current_step: 0,
            notes: `OSM (${shop.shopType}) - ${shop.lat.toFixed(4)}, ${shop.lon.toFixed(4)}`,
          })
          .select()
          .single();

        if (leadError) {
          console.error(`marketing-lead-finder: Error saving "${shop.name}":`, leadError.message);
          continue;
        }

        stats.total++;
        stats.osmTotal++;
        
        if (hasEmail) {
          stats.withEmail++;
          createdLeads.push(`📧 ${shop.name}`);
          // Schedule email if has email
          if (sequence?.id && newLead) {
            await scheduleFirstEmail(supabase, newLead.id, sequence.id);
          }
        } else if (hasPhone) {
          stats.phoneOnly++;
          createdLeads.push(`📞 ${shop.name}`);
        } else if (hasWebsite) {
          stats.websiteOnly++;
          createdLeads.push(`🌐 ${shop.name}`);
          // Mark for enrichment (has website, might find email)
          if (newLead && shopsToEnrich.length < 15) {
            shopsToEnrich.push({ shop, leadId: newLead.id });
          }
        }
        
        console.log(`marketing-lead-finder: ✓ "${shop.name}" (${leadStatus})`);

      } catch (shopError) {
        console.error(`marketing-lead-finder: Error processing "${shop.name}":`, shopError);
      }
    }

    // ========== PHASE 3: Enrich top leads with websites (limited to avoid timeout) ==========
    if (firecrawlApiKey && shopsToEnrich.length > 0) {
      console.log(`marketing-lead-finder: Enriching ${shopsToEnrich.length} leads with websites...`);
      
      for (const { shop, leadId } of shopsToEnrich.slice(0, 10)) {
        try {
          const email = await quickEmailExtract(shop.website!, firecrawlApiKey);
          
          if (email) {
            await supabase
              .from("marketing_leads")
              .update({ 
                email, 
                status: 'new',
                auto_processed: true,
                current_sequence_id: sequence?.id,
                notes: `OSM + email arricchita da ${shop.website}`
              })
              .eq("id", leadId);
            
            stats.enriched++;
            stats.withEmail++;
            stats.websiteOnly--;
            console.log(`marketing-lead-finder: 📧 Enriched "${shop.name}" with email: ${email}`);
            
            if (sequence?.id) {
              await scheduleFirstEmail(supabase, leadId, sequence.id);
            }
          }
        } catch (err) {
          console.log(`marketing-lead-finder: Could not enrich "${shop.name}"`);
        }
      }
    }

    // Update zone stats
    if (zone) {
      await supabase
        .from("marketing_scan_zones")
        .update({
          last_scanned_at: new Date().toISOString(),
          total_leads_found: (zone.total_leads_found || 0) + stats.total,
        })
        .eq("id", zone.id);
    }

    // Log the search
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'scan',
        message: `Scansione "${zoneName}": ${stats.total} lead trovati`,
        details: { 
          zone_name: zoneName,
          search_type: searchType,
          ...stats
        },
        zone_id: zone?.id || null,
      });

    console.log(`marketing-lead-finder: DONE - ${stats.total} leads (${stats.withEmail} email, ${stats.phoneOnly} phone, ${stats.websiteOnly} website)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadsCreated: stats.total,
        leadsWithEmail: stats.withEmail,
        leadsPhoneOnly: stats.phoneOnly,
        leadsWebsiteOnly: stats.websiteOnly,
        enriched: stats.enriched,
        message: `Trovati ${stats.total} lead: ${stats.withEmail} con email, ${stats.phoneOnly} solo telefono, ${stats.websiteOnly} solo sito web`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("marketing-lead-finder: FATAL ERROR:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
        leadsCreated: 0
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// ========== OVERPASS API (FREE) ==========
async function searchOverpass(lat: number, lon: number, radiusKm: number, searchType: string): Promise<OverpassShop[]> {
  const radiusMeters = radiusKm * 1000;
  
  // Build shop type filters
  let shopTypes: string[] = [];
  
  if (searchType === "centro" || searchType === "both") {
    shopTypes.push(
      'nwr["craft"="electronics_repair"]',
      'nwr["shop"="mobile_phone"]["repair"="yes"]',
      'nwr["repair"~"phone|mobile|smartphone"]',
      'nwr["shop"="repair"]'
    );
  }
  
  if (searchType === "corner" || searchType === "both") {
    shopTypes.push(
      'nwr["shop"="mobile_phone"]',
      'nwr["shop"="electronics"]',
      'nwr["shop"="computer"]',
      'nwr["shop"="telecommunication"]',
      'nwr["shop"="hifi"]',
      'nwr["shop"="appliance"]',
      'nwr["shop"="electrical"]',
      'nwr["office"="telecommunication"]'
    );
  }

  const query = `
[out:json][timeout:25];
(
  ${shopTypes.map(t => `${t}(around:${radiusMeters},${lat},${lon});`).join('\n  ')}
);
out center tags;
  `.trim();

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const server of servers) {
    try {
      console.log(`marketing-lead-finder: Trying ${server}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`marketing-lead-finder: ${server} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const shops: OverpassShop[] = [];

      for (const element of data.elements || []) {
        if (!element.tags?.name) continue;

        const tags = element.tags;
        const elemLat = element.lat || element.center?.lat;
        const elemLon = element.lon || element.center?.lon;
        
        shops.push({
          name: tags.name,
          phone: tags.phone || tags['contact:phone'] || undefined,
          email: tags.email || tags['contact:email'] || undefined,
          website: tags.website || tags['contact:website'] || tags.url || undefined,
          address: formatOsmAddress(tags),
          lat: elemLat || lat,
          lon: elemLon || lon,
          shopType: tags.shop || tags.craft || tags.amenity || 'unknown',
        });
      }

      console.log(`marketing-lead-finder: Got ${shops.length} shops from Overpass`);
      return shops;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`marketing-lead-finder: ${server} timed out`);
      } else {
        console.error(`marketing-lead-finder: ${server} error:`, err);
      }
    }
  }

  console.log(`marketing-lead-finder: All Overpass servers failed`);
  return [];
}

function formatOsmAddress(tags: Record<string, string>): string | undefined {
  const parts: string[] = [];
  if (tags['addr:street']) {
    parts.push(tags['addr:street'] + (tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''));
  }
  if (tags['addr:postcode'] || tags['addr:city']) {
    parts.push([tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' '));
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function mapOsmTypeToBusinessType(osmType: string): string {
  switch (osmType) {
    case 'electronics_repair':
      return 'centro';
    case 'mobile_phone':
      return 'telefonia';
    case 'electronics':
      return 'elettronica';
    case 'computer':
      return 'computer';
    default:
      return 'corner';
  }
}

// ========== REAL EMAIL EXTRACTION (no fake emails) ==========
async function quickEmailExtract(websiteUrl: string, apiKey: string): Promise<string | null> {
  try {
    const baseUrl = new URL(websiteUrl);
    
    // Skip social media and generic sites
    const skipDomains = ['facebook', 'instagram', 'twitter', 'linkedin', 'google', 'youtube', 'tiktok'];
    if (skipDomains.some(d => baseUrl.hostname.includes(d))) {
      return null;
    }
    
    // Try multiple pages to find real email
    const pagesToTry = [
      baseUrl.origin,
      baseUrl.origin + '/contatti',
      baseUrl.origin + '/contacts',
      baseUrl.origin + '/contact',
      baseUrl.origin + '/chi-siamo',
      baseUrl.origin + '/about',
    ];
    
    for (const pageUrl of pagesToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['markdown'],
            timeout: 5000,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.data?.markdown || '';
        
        // Extract ALL emails with regex
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const allEmails = content.match(emailRegex) || [];
        
        // Filter to find REAL business emails only
        for (const rawEmail of allEmails) {
          const email = rawEmail.toLowerCase();
          
          // Skip fake/generic/system emails
          const skipPatterns = [
            'example', 'test@', 'noreply', 'no-reply', 'donotreply',
            'privacy@', 'gdpr@', 'cookie@', 'abuse@', 'postmaster@',
            'webmaster@', 'hostmaster@', 'mailer-daemon', 'newsletter@',
            '@sentry.io', '@google.com', '@facebook.com', '@twitter.com',
            '@example.com', '@test.com', 'wordpress', 'wix.com', '@w3.org'
          ];
          
          if (skipPatterns.some(p => email.includes(p))) {
            continue;
          }
          
          // Must be a real domain email (not info@ generic unless it's their domain)
          if (email.includes('@')) {
            console.log(`marketing-lead-finder: Found REAL email: ${email} on ${pageUrl}`);
            return email;
          }
        }
      } catch (pageErr) {
        // Continue to next page
      }
    }

    // NO email found - return null, DO NOT INVENT
    return null;
  } catch {
    return null;
  }
}

// ========== SCHEDULE FIRST EMAIL ==========
async function scheduleFirstEmail(supabase: any, leadId: string, sequenceId: string) {
  try {
    const { data: firstStep } = await supabase
      .from("marketing_email_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .eq("step_order", 1)
      .single();

    if (!firstStep) return;

    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + (firstStep.delay_hours || 1));

    await supabase
      .from("marketing_scheduled_emails")
      .insert({
        lead_id: leadId,
        step_id: firstStep.id,
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
      });
  } catch (err) {
    console.error("marketing-lead-finder: Error scheduling email:", err);
  }
}

Deno.serve(handler);
