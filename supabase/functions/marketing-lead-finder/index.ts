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

interface SearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-lead-finder: Starting hybrid lead search (OSM + Firecrawl)");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { zoneId, cityName, searchType = "both", scanSource = "both" } = body; // scanSource: "osm", "firecrawl", "both"

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

    console.log(`marketing-lead-finder: Searching in "${zoneName}" (lat: ${lat}, lon: ${lon}, radius: ${radiusKm}km)`);

    // Get default funnel stage and sequence early
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

    let leadsCreated = 0;
    let osmLeadsCreated = 0;
    let firecrawlLeadsCreated = 0;
    const createdLeads: string[] = [];
    const processedBusinesses = new Set<string>();

    // ========== PHASE 1: OpenStreetMap/Overpass (FREE) ==========
    if (lat && lon) {
      console.log(`marketing-lead-finder: Phase 1 - Searching Overpass API (FREE)`);
      
      const osmShops = await searchOverpass(lat, lon, radiusKm, searchType);
      console.log(`marketing-lead-finder: Overpass found ${osmShops.length} shops`);

      for (const shop of osmShops) {
        try {
          // Skip if already processed
          const businessKey = `${shop.name.toLowerCase()}-${shop.phone || ''}-${shop.website || ''}`;
          if (processedBusinesses.has(businessKey)) continue;
          processedBusinesses.add(businessKey);

          // Check if lead exists
          const { data: existingLeads } = await supabase
            .from("marketing_leads")
            .select("id")
            .or(`business_name.ilike.%${shop.name.substring(0, 15)}%,phone.eq.${shop.phone || 'NONE'}`)
            .limit(1);

          if (existingLeads && existingLeads.length > 0) {
            console.log(`marketing-lead-finder: OSM - "${shop.name}" already exists`);
            continue;
          }

          let email: string | undefined = shop.email || undefined;
          
          // If no email but has website, try scraping contact page (only if Firecrawl is configured)
          if (!email && shop.website && firecrawlApiKey) {
            console.log(`marketing-lead-finder: OSM - Enriching "${shop.name}" via Firecrawl`);
            const scrapedEmail = await scrapeContactPageForEmail(shop.website, firecrawlApiKey);
            if (scrapedEmail) email = scrapedEmail;
          }

          // Determine business type from OSM shop type
          const businessType = mapOsmTypeToBusinessType(shop.shopType);

          // Skip shops without email - we need email for marketing automation
          if (!email) {
            console.log(`marketing-lead-finder: OSM - Skipping "${shop.name}" - no email found`);
            continue;
          }

          // Create lead with email only
          const { data: newLead, error: leadError } = await supabase
            .from("marketing_leads")
            .insert({
              source: 'openstreetmap',
              business_name: shop.name,
              website: shop.website || null,
              phone: shop.phone || null,
              email: email,
              address: shop.address || `${zoneName}, Italia`,
              business_type: businessType,
              status: 'new',
              auto_processed: true,
              scan_zone_id: zone?.id || null,
              funnel_stage_id: defaultStage?.id || null,
              current_sequence_id: sequence?.id || null,
              current_step: 0,
              notes: `Trovato via OpenStreetMap (${shop.shopType})\nCoordinate: ${shop.lat}, ${shop.lon}`,
            })
            .select()
            .single();

          if (leadError) {
            console.error(`marketing-lead-finder: OSM - Error creating lead:`, leadError);
            continue;
          }

          leadsCreated++;
          osmLeadsCreated++;
          createdLeads.push(`📍 ${shop.name}`);
          console.log(`marketing-lead-finder: OSM ✓ Created "${shop.name}" (email: ${email || 'N/A'}, phone: ${shop.phone || 'N/A'})`);

          // Schedule email
          if (sequence?.id && newLead) {
            await scheduleFirstEmail(supabase, newLead.id, sequence.id);
          }

        } catch (shopError) {
          console.error(`marketing-lead-finder: OSM - Error processing shop:`, shopError);
        }
      }
    } else {
      console.log(`marketing-lead-finder: Skipping Overpass - zone has no coordinates`);
    }

    // ========== PHASE 2: Firecrawl Search ==========
    const shouldUseFirecrawl = (scanSource === "firecrawl" || scanSource === "both") && firecrawlApiKey;
    const firecrawlNeeded = scanSource === "firecrawl" || (scanSource === "both" && osmLeadsCreated < 5);
    
    if (shouldUseFirecrawl && firecrawlNeeded) {
      console.log(`marketing-lead-finder: Phase 2 - Firecrawl search (source: ${scanSource}, OSM found: ${osmLeadsCreated})`);
      
      const firecrawlResults = await searchFirecrawl(zoneName, searchType, firecrawlApiKey!);
      console.log(`marketing-lead-finder: Firecrawl found ${firecrawlResults.length} results`);

      for (const result of firecrawlResults) {
        try {
          const businessName = extractBusinessName(result.title || '', result.url || '');
          
          // Skip if already processed via OSM
          const businessKey = businessName.toLowerCase();
          if (processedBusinesses.has(businessKey)) continue;
          processedBusinesses.add(businessKey);

          if (!businessName || businessName.length < 3) continue;

          // Check if exists
          const { data: existingLeads } = await supabase
            .from("marketing_leads")
            .select("id")
            .or(`business_name.ilike.%${businessName.substring(0, 15)}%,website.eq.${result.url}`)
            .limit(1);

          if (existingLeads && existingLeads.length > 0) continue;

          // Extract contact info
          let contactInfo = extractContactInfo(result.markdown || result.description || '', result.url);

          // Try contact page if no email
          if (!contactInfo.email && result.url) {
            contactInfo.email = await scrapeContactPageForEmail(result.url, firecrawlApiKey);
          }

          // Skip if no email - Firecrawl results need email for ROI
          if (!contactInfo.email) {
            console.log(`marketing-lead-finder: Firecrawl ✗ Skipping "${businessName}" - no email`);
            continue;
          }

          const businessType = determineBusinessType(result.title || '', result.description || '');

          const { data: newLead, error: leadError } = await supabase
            .from("marketing_leads")
            .insert({
              source: 'firecrawl_search',
              business_name: businessName,
              website: result.url,
              phone: contactInfo.phone,
              email: contactInfo.email,
              address: contactInfo.address || `${zoneName}, Italia`,
              business_type: businessType,
              status: 'new',
              auto_processed: true,
              scan_zone_id: zone?.id || null,
              funnel_stage_id: defaultStage?.id || null,
              current_sequence_id: sequence?.id || null,
              current_step: 0,
              notes: `Trovato via Firecrawl search`,
            })
            .select()
            .single();

          if (leadError) continue;

          leadsCreated++;
          firecrawlLeadsCreated++;
          createdLeads.push(`🔍 ${businessName}`);
          console.log(`marketing-lead-finder: Firecrawl ✓ Created "${businessName}"`);

          if (sequence?.id && newLead) {
            await scheduleFirstEmail(supabase, newLead.id, sequence.id);
          }

        } catch (resultError) {
          console.error(`marketing-lead-finder: Firecrawl - Error processing result:`, resultError);
        }
      }
    } else if (!firecrawlApiKey && scanSource !== "osm") {
      console.log(`marketing-lead-finder: Firecrawl not configured`);
    } else if (scanSource === "both" && !firecrawlNeeded) {
      console.log(`marketing-lead-finder: Skipping Firecrawl - OSM found enough leads (${osmLeadsCreated})`);
    }

    // Update zone stats
    if (zone) {
      await supabase
        .from("marketing_scan_zones")
        .update({
          last_scanned_at: new Date().toISOString(),
          total_leads_found: (zone.total_leads_found || 0) + leadsCreated,
        })
        .eq("id", zone.id);
    }

    // Log the search
    await supabase
      .from("marketing_automation_logs")
      .insert({
        log_type: 'scan',
        message: `Scansione ibrida "${zoneName}": ${leadsCreated} lead (OSM: ${osmLeadsCreated}, Firecrawl: ${firecrawlLeadsCreated})`,
        details: { 
          zone_name: zoneName,
          search_type: searchType,
          leads_created: leadsCreated,
          osm_leads: osmLeadsCreated,
          firecrawl_leads: firecrawlLeadsCreated,
          leads: createdLeads
        },
        zone_id: zone?.id || null,
      });

    console.log(`marketing-lead-finder: Completed. Created ${leadsCreated} leads (OSM: ${osmLeadsCreated}, Firecrawl: ${firecrawlLeadsCreated})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadsCreated,
        osmLeads: osmLeadsCreated,
        firecrawlLeads: firecrawlLeadsCreated,
        resultsFound: osmLeadsCreated + firecrawlLeadsCreated,
        leads: createdLeads
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("marketing-lead-finder: Error:", error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

// ========== OVERPASS API (FREE) ==========
async function searchOverpass(lat: number, lon: number, radiusKm: number, searchType: string): Promise<OverpassShop[]> {
  const radiusMeters = radiusKm * 1000;
  
  // Build shop type filters - include both node AND way (buildings)
  let shopTypes: string[] = [];
  
  if (searchType === "centro" || searchType === "both") {
    shopTypes.push(
      'nwr["craft"="electronics_repair"]',
      'nwr["shop"="mobile_phone"]["repair"="yes"]',
      'nwr["repair"~"phone|mobile|smartphone|cellulare"]',
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
      'nwr["amenity"="telephone"]',
      'nwr["office"="telecommunication"]'
    );
  }

  // Use simpler query syntax that works better
  const query = `
[out:json][timeout:30];
(
  ${shopTypes.map(t => `${t}(around:${radiusMeters},${lat},${lon});`).join('\n  ')}
);
out center tags;
  `.trim();

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  for (const server of servers) {
    try {
      console.log(`marketing-lead-finder: Trying Overpass server: ${server}`);
      
      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.log(`marketing-lead-finder: Overpass ${server} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const shops: OverpassShop[] = [];

      for (const element of data.elements || []) {
        if (!element.tags?.name) continue;

        const tags = element.tags;
        // Get coordinates - for ways/relations use center
        const elemLat = element.lat || element.center?.lat;
        const elemLon = element.lon || element.center?.lon;
        
        shops.push({
          name: tags.name,
          phone: tags.phone || tags['contact:phone'] || null,
          email: tags.email || tags['contact:email'] || null,
          website: tags.website || tags['contact:website'] || tags.url || null,
          address: formatOsmAddress(tags),
          lat: elemLat || lat,
          lon: elemLon || lon,
          shopType: tags.shop || tags.craft || tags.amenity || 'unknown',
        });
      }

      console.log(`marketing-lead-finder: Overpass returned ${shops.length} named shops`);
      return shops;

    } catch (err) {
      console.error(`marketing-lead-finder: Overpass ${server} error:`, err);
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

// ========== FIRECRAWL SEARCH (PAID - Fallback) ==========
async function searchFirecrawl(zoneName: string, searchType: string, apiKey: string): Promise<SearchResult[]> {
  const queries: string[] = [];
  
  if (searchType === "centro" || searchType === "both") {
    queries.push(`riparazione smartphone ${zoneName}`, `centro assistenza telefoni ${zoneName}`);
  }
  if (searchType === "corner" || searchType === "both") {
    queries.push(`negozio telefonia ${zoneName}`, `vendita smartphone ${zoneName}`);
  }

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  const skipDomains = [
    'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 
    'youtube.com', 'wikipedia.org', 'tripadvisor', 'paginegialle.it',
    'paginebianche.it', 'subito.it', 'kijiji.it', 'ebay.it', 'amazon.',
    'unieuro.it', 'trony.it', 'mediaworld.it', 'euronics.it', 'expert.it',
    'apple.com', 'samsung.com', 'huawei.com', 'xiaomi.com', 'oppo.com'
  ];

  for (const query of queries) {
    try {
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 8,
          lang: 'it',
          country: 'IT',
          scrapeOptions: { formats: ['markdown'] }
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      for (const result of data.data || []) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        
        const url = result.url?.toLowerCase() || '';
        if (skipDomains.some(d => url.includes(d))) continue;

        allResults.push(result);
      }
    } catch (err) {
      console.error(`marketing-lead-finder: Firecrawl search error for "${query}":`, err);
    }
  }

  return allResults;
}

// ========== CONTACT PAGE SCRAPING (Minimal) ==========
async function scrapeContactPageForEmail(websiteUrl: string, apiKey: string): Promise<string | null> {
  try {
    const baseUrl = new URL(websiteUrl);
    const contactPaths = ['/contatti', '/contact'];
    
    for (const path of contactPaths) {
      const contactUrl = `${baseUrl.origin}${path}`;
      
      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: contactUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const content = data.data?.markdown || data.markdown || '';
        
        if (content && content.length < 80000) {
          const contactInfo = extractContactInfo(content, websiteUrl);
          if (contactInfo.email) {
            console.log(`marketing-lead-finder: Found email via ${path}: ${contactInfo.email}`);
            return contactInfo.email;
          }
        }
      } catch {
        // Continue to next path
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}

// ========== SCHEDULE FIRST EMAIL ==========
async function scheduleFirstEmail(supabase: any, leadId: string, sequenceId: string) {
  const { data: firstStep } = await supabase
    .from("marketing_sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .eq("step_number", 1)
    .single();

  if (firstStep) {
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + (firstStep.delay_hours || 0));
    scheduledFor.setDate(scheduledFor.getDate() + (firstStep.delay_days || 0));

    await supabase
      .from("marketing_email_queue")
      .insert({
        lead_id: leadId,
        template_id: firstStep.template_id,
        sequence_id: sequenceId,
        step_number: 1,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      });
  }
}

// ========== HELPER FUNCTIONS ==========
function extractBusinessName(title: string, url: string): string {
  let name = title.split(/\s*[-|–—]\s*/)[0].trim();
  
  if (name.length > 60) {
    name = name.substring(0, 60);
  }

  if (name.length < 3) {
    try {
      const hostname = new URL(url).hostname;
      name = hostname
        .replace(/^www\./, '')
        .replace(/\.(com|it|net|org|eu|info|biz|shop|store)$/g, '')
        .replace(/[-_]/g, ' ')
        .trim();
    } catch {
      name = title.substring(0, 50).trim();
    }
  }

  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .substring(0, 100);
}

function extractContactInfo(text: string, siteUrl?: string): { phone: string | null; email: string | null; address: string | null } {
  // Phone patterns (Italian)
  const phonePatterns = [
    /\+39\s*\d{2,4}[\s.-]?\d{6,8}/g,
    /0\d{1,4}[\s.-]?\d{6,8}/g,
    /3\d{2}[\s.-]?\d{6,7}/g,
  ];
  
  let phone: string | null = null;
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0].replace(/[\s.-]/g, '');
      break;
    }
  }

  let siteDomain: string | null = null;
  if (siteUrl) {
    try {
      siteDomain = new URL(siteUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch {}
  }

  // Email extraction
  const foundEmails: string[] = [];
  
  const mailtoMatches = text.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
  for (const match of mailtoMatches) {
    const email = match[1].toLowerCase();
    if (isValidBusinessEmail(email, siteDomain)) {
      foundEmails.push(email);
    }
  }
  
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailPattern);
  if (matches) {
    for (const match of matches) {
      const cleanEmail = match.toLowerCase();
      if (isValidBusinessEmail(cleanEmail, siteDomain) && !foundEmails.includes(cleanEmail)) {
        foundEmails.push(cleanEmail);
      }
    }
  }

  // Prioritize domain-matching email
  let email: string | null = null;
  if (foundEmails.length > 0) {
    if (siteDomain) {
      const domainMatch = foundEmails.find(e => e.endsWith(`@${siteDomain}`));
      if (domainMatch) email = domainMatch;
    }
    if (!email) email = foundEmails[0];
  }

  // Address
  const addressMatch = text.match(/(?:via|viale|piazza|corso|largo)\s+[^,\n]{3,50},?\s*\d{5}?\s*[a-zA-Z]+/i);
  const address = addressMatch ? addressMatch[0] : null;

  return { phone, email, address };
}

function isValidBusinessEmail(email: string, siteDomain?: string | null): boolean {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return false;
  if (email.length < 6 || email.length > 100) return false;
  
  const emailLower = email.toLowerCase();
  const emailDomain = email.split('@')[1].toLowerCase();
  const emailPrefix = email.split('@')[0].toLowerCase();
  
  const fakePrefixes = ['example', 'test', 'demo', 'noreply', 'no-reply', 'postmaster', 'webmaster'];
  if (fakePrefixes.some(p => emailPrefix.startsWith(p))) return false;
  
  const fakeDomains = ['example.com', 'example.it', 'test.com', 'localhost', 'sentry.io'];
  if (fakeDomains.some(d => emailDomain.includes(d))) return false;
  
  if (emailLower.includes('.blink') || /^[a-f0-9-]{20,}@/.test(emailLower)) return false;
  
  return true;
}

function determineBusinessType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('riparazione') || text.includes('assistenza') || text.includes('repair')) return 'centro';
  if (text.includes('negozio') || text.includes('vendita') || text.includes('store')) return 'corner';
  if (text.includes('computer') || text.includes('pc')) return 'computer';
  if (text.includes('elettronica')) return 'elettronica';
  
  return 'telefonia';
}

Deno.serve(handler);
