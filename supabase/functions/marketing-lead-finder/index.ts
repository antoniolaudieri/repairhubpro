import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  source: 'firecrawl' | 'osm';
}

interface LeadStats {
  total: number;
  withEmail: number;
  phoneOnly: number;
  websiteOnly: number;
  fromSearch: number;
  fromOsm: number;
  enriched: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-lead-finder: Starting MULTI-SOURCE lead search");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { zoneId, cityName, searchType = "both" } = body;

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

    console.log(`marketing-lead-finder: Zone "${zoneName}" (radius: ${radiusKm}km)`);

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
      fromSearch: 0,
      fromOsm: 0,
      enriched: 0,
    };
    
    const allResults: SearchResult[] = [];

    // ========== PHASE 1: FIRECRAWL SEARCH (PRIMARY - finds sites WITH email) ==========
    if (firecrawlApiKey) {
      console.log(`marketing-lead-finder: [PHASE 1] Firecrawl Search for "${zoneName}"...`);
      
      const searchQueries = buildSearchQueries(zoneName, searchType);
      console.log(`marketing-lead-finder: Executing ${searchQueries.length} queries sequentially...`);
      
      // Execute queries SEQUENTIALLY with delay to avoid rate limiting and timeouts
      for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        console.log(`marketing-lead-finder: Query ${i + 1}/${searchQueries.length}: "${query}"`);
        
        try {
          const searchResults = await firecrawlSearchWithRetry(query, firecrawlApiKey);
          console.log(`marketing-lead-finder: ✓ Found ${searchResults.length} results`);
          
          for (const result of searchResults) {
            // Check if not already added
            const isDupe = allResults.some(r => 
              r.website === result.website || 
              r.name.toLowerCase() === result.name.toLowerCase()
            );
            if (!isDupe && result.email) {
              allResults.push(result);
              stats.fromSearch++;
            }
          }
        } catch (err) {
          console.log(`marketing-lead-finder: ✗ Query failed after retries: ${query}`);
        }
        
        // Delay 3 seconds between queries to avoid rate limiting
        if (i < searchQueries.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      console.log(`marketing-lead-finder: [PHASE 1] Found ${allResults.length} leads with email from search`);
    } else {
      console.log(`marketing-lead-finder: No Firecrawl API key, skipping web search`);
    }

    // ========== PHASE 2: OSM BACKUP (finds local shops) ==========
    if (lat && lon) {
      console.log(`marketing-lead-finder: [PHASE 2] OSM search (lat: ${lat}, lon: ${lon}, radius: ${radiusKm}km)...`);
      
      const osmShops = await searchOverpass(lat, lon, radiusKm, searchType);
      console.log(`marketing-lead-finder: OSM found ${osmShops.length} shops`);
      
      // Add OSM results that aren't duplicates
      for (const shop of osmShops) {
        const isDupe = allResults.some(r => 
          r.name.toLowerCase() === shop.name.toLowerCase() ||
          (r.website && shop.website && extractDomain(r.website) === extractDomain(shop.website))
        );
        
        if (!isDupe) {
          allResults.push({
            name: shop.name,
            email: shop.email,
            phone: shop.phone,
            website: shop.website,
            address: shop.address || `${zoneName}, Italia`,
            source: 'osm',
          });
          stats.fromOsm++;
        }
      }
      
      console.log(`marketing-lead-finder: [PHASE 2] Added ${stats.fromOsm} from OSM`);
    }

    // ========== PHASE 3: PARALLEL ENRICHMENT (for leads with website but no email) ==========
    if (firecrawlApiKey) {
      const toEnrich = allResults.filter(r => r.website && !r.email).slice(0, 20);
      
      if (toEnrich.length > 0) {
        console.log(`marketing-lead-finder: [PHASE 3] Parallel enrichment for ${toEnrich.length} leads...`);
        
        // Process in batches of 5 for parallel execution
        const batchSize = 5;
        for (let i = 0; i < toEnrich.length; i += batchSize) {
          const batch = toEnrich.slice(i, i + batchSize);
          
          const enrichPromises = batch.map(async (result) => {
            try {
              const email = await quickEmailExtract(result.website!, firecrawlApiKey);
              if (email) {
                result.email = email;
                stats.enriched++;
                console.log(`marketing-lead-finder: ✓ Enriched "${result.name}" with ${email}`);
              }
            } catch {
              // Silent fail
            }
          });
          
          await Promise.allSettled(enrichPromises);
        }
        
        console.log(`marketing-lead-finder: [PHASE 3] Enriched ${stats.enriched} leads with email`);
      }
    }

    // ========== PHASE 4: POSITIVE FILTER + SAVE LEADS ==========
    console.log(`marketing-lead-finder: [PHASE 4] Applying POSITIVE filter (whitelist + score)...`);
    
    let excludedCount = 0;
    let lowScoreCount = 0;
    
    const filteredResults = allResults.filter(result => {
      const check = isRelevantLead(result.name, result.website || '', result.email, zoneName);
      
      if (!check.relevant) {
        if (check.reason.includes('Excluded domain') || check.reason.includes('No required keyword')) {
          excludedCount++;
          console.log(`marketing-lead-finder: ✗ EXCLUDED "${result.name}" - ${check.reason}`);
        } else {
          lowScoreCount++;
          console.log(`marketing-lead-finder: ✗ LOW SCORE "${result.name}" - ${check.reason}`);
        }
        return false;
      }
      
      console.log(`marketing-lead-finder: ✓ RELEVANT "${result.name}" - ${check.reason}`);
      return true;
    });
    
    console.log(`marketing-lead-finder: Filtered out ${excludedCount} (excluded domains/keywords) + ${lowScoreCount} (low score), keeping ${filteredResults.length} relevant leads`);
    
    for (const result of filteredResults) {
      try {
        // Skip leads with no useful contact info
        if (!result.email && !result.phone && !result.website) {
          continue;
        }

        // Check for duplicates in database
        const { data: existingLeads } = await supabase
          .from("marketing_leads")
          .select("id")
          .or(`business_name.ilike.%${result.name.substring(0, 15)}%,email.eq.${result.email || 'NONE'}`)
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          continue;
        }

        // Determine status based on contact info
        let leadStatus = 'needs_enrichment';
        if (result.email) {
          leadStatus = 'new';
        } else if (result.phone) {
          leadStatus = 'manual_contact';
        }

        const businessType = result.source === 'osm' ? 'corner' : 
          (searchType === 'centro' ? 'centro' : 'corner');

        // Insert lead
        const { data: newLead, error: leadError } = await supabase
          .from("marketing_leads")
          .insert({
            source: result.source === 'osm' ? 'openstreetmap' : 'web_search',
            business_name: result.name,
            website: result.website || null,
            phone: result.phone || null,
            email: result.email || null,
            address: result.address || `${zoneName}, Italia`,
            business_type: businessType,
            status: leadStatus,
            auto_processed: !!result.email,
            scan_zone_id: zone?.id || null,
            funnel_stage_id: defaultStage?.id || null,
            current_sequence_id: result.email ? sequence?.id : null,
            current_step: 0,
            notes: `Source: ${result.source}`,
          })
          .select()
          .single();

        if (leadError) {
          console.error(`marketing-lead-finder: Error saving "${result.name}":`, leadError.message);
          continue;
        }

        stats.total++;
        
        if (result.email) {
          stats.withEmail++;
          // Schedule first email
          if (sequence?.id && newLead) {
            await scheduleFirstEmail(supabase, newLead.id, sequence.id);
          }
        } else if (result.phone) {
          stats.phoneOnly++;
        } else if (result.website) {
          stats.websiteOnly++;
        }
        
        console.log(`marketing-lead-finder: ✓ Saved "${result.name}" (${leadStatus})`);

      } catch (err) {
        console.error(`marketing-lead-finder: Error processing "${result.name}":`, err);
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
        message: `Scansione "${zoneName}": ${stats.total} lead (${stats.withEmail} con email)`,
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
        fromSearch: stats.fromSearch,
        fromOsm: stats.fromOsm,
        message: `Trovati ${stats.total} lead: ${stats.withEmail} con email, ${stats.phoneOnly} solo telefono, ${stats.websiteOnly} solo sito`
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

// ========== WHITELIST KEYWORD POSITIVE (MUST MATCH) ==========
const REQUIRED_KEYWORDS = [
  // Telefonia e cellulari
  'telefon', 'cellulari', 'smartphone', 'mobile', 'phone', 'iphone', 'samsung', 'huawei', 'xiaomi', 'oppo', 'realme',
  // Operatori
  'tim', 'vodafone', 'wind', 'tre', '3 store', 'iliad', 'fastweb', 'tiscali', 'ho.mobile', 'kena', 'postemobile', 'very mobile',
  // Riparazione
  'riparazione', 'riparazioni', 'assistenza', 'fix', 'repair', 'service', 'tecnico', 'laboratorio',
  // Negozi
  'negozio', 'shop', 'store', 'punto vendita', 'centro', 'multiservizi', 'accessori',
  // Elettronica
  'elettronica', 'hi-tech', 'informatica', 'computer', 'tablet', 'apple', 'android',
  // Keyword generiche (ampliamento)
  'vendita', 'usato', 'ricondizionato', 'hi-fi', 'audio', 'video',
  'connettività', 'internet', 'fibra', 'wifi', 'rete',
  // Location hints
  'contatti', 'orari', 'dove siamo', 'chi siamo',
];

// ========== EXCLUDED DOMAINS (News, blog, social, annunci) ==========
const EXCLUDED_DOMAINS = [
  // Social media
  'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'tiktok.com',
  // News e blog
  'ilfattoquotidiano', 'repubblica', 'corriere', 'lastampa', 'ansa', 'ilmessaggero', 'ilgiornale',
  'fanpage', 'huffingtonpost', 'tgcom24', 'sky.it', 'rai.it', 'mediaset',
  'blog', 'wordpress', 'blogspot', 'medium.com', 'tumblr',
  // Wikipedia e directory
  'wikipedia.org', 'wikihow', 'paginegialle', 'paginebianche', 'yelp', 'tripadvisor',
  // Annunci e marketplace
  'subito.it', 'kijiji', 'bakeca', 'ebay', 'amazon', 'aliexpress',
  // Altri
  'google.com', 'apple.com/it', 'samsung.com', 'gov.it', 'edu.it',
  'comune.', 'provincia.', 'regione.',
];

// ========== RELEVANCE SCORING FUNCTION ==========
function calculateRelevanceScore(name: string, url: string, email: string | undefined, cityName?: string): number {
  let score = 0;
  const nameLower = name.toLowerCase();
  const urlLower = (url || '').toLowerCase();
  const emailLower = (email || '').toLowerCase();
  
  // +3 punti: Nome contiene operatore telefonico
  const operators = ['tim', 'vodafone', 'wind', 'tre', 'iliad', 'fastweb', 'ho.mobile', 'kena', 'postemobile'];
  if (operators.some(op => nameLower.includes(op))) {
    score += 3;
  }
  
  // +2 punti: Nome contiene keyword telefonia
  const phoneKeywords = ['telefon', 'cellulari', 'smartphone', 'mobile', 'phone', 'iphone', 'samsung'];
  if (phoneKeywords.some(kw => nameLower.includes(kw))) {
    score += 2;
  }
  
  // +2 punti: Nome contiene keyword riparazione
  const repairKeywords = ['riparazione', 'riparazioni', 'assistenza', 'repair', 'fix', 'service'];
  if (repairKeywords.some(kw => nameLower.includes(kw))) {
    score += 2;
  }
  
  // +2 punti: URL contiene keyword telefonia (aumentato da +1)
  const urlKeywords = ['phone', 'mobile', 'cell', 'ripar', 'telefon', 'tim', 'vodafone', 'smartphone', 'fix'];
  if (urlKeywords.some(kw => urlLower.includes(kw))) {
    score += 2;
  }
  
  // +2 punti: Email aziendale (non generica) - aumentato da +1
  const genericDomains = ['gmail', 'hotmail', 'yahoo', 'libero', 'outlook', 'icloud', 'live.', 'msn.'];
  if (email && !genericDomains.some(d => emailLower.includes(d))) {
    score += 2;
  }
  
  // +1 punto: Nome contiene "negozio" o "centro" o "punto"
  if (['negozio', 'centro', 'punto', 'shop', 'store'].some(kw => nameLower.includes(kw))) {
    score += 1;
  }
  
  // +2 punti: Nome contiene la città cercata (NUOVO)
  if (cityName && nameLower.includes(cityName.toLowerCase())) {
    score += 2;
  }
  
  return score;
}

// ========== CHECK IF LEAD IS RELEVANT (POSITIVE FILTER) ==========
function isRelevantLead(name: string, url: string, email: string | undefined, cityName?: string): { relevant: boolean; score: number; reason: string } {
  const nameLower = name.toLowerCase();
  const urlLower = (url || '').toLowerCase();
  const emailLower = (email || '').toLowerCase();
  
  // CHECK 1: Domain must not be excluded
  for (const domain of EXCLUDED_DOMAINS) {
    if (urlLower.includes(domain)) {
      return { relevant: false, score: 0, reason: `Excluded domain: ${domain}` };
    }
  }
  
  // BYPASS: Se ha email aziendale (non generica), salva sempre!
  const genericDomains = ['gmail', 'hotmail', 'yahoo', 'libero', 'outlook', 'icloud', 'live.', 'msn.'];
  const hasBusinessEmail = email && !genericDomains.some(d => emailLower.includes(d));
  
  if (hasBusinessEmail) {
    const score = calculateRelevanceScore(name, url, email, cityName);
    return { relevant: true, score: score + 2, reason: `Business email bypass (score: ${score + 2})` };
  }
  
  // CHECK 2: Must contain at least one required keyword
  const hasRequiredKeyword = REQUIRED_KEYWORDS.some(kw => 
    nameLower.includes(kw) || urlLower.includes(kw)
  );
  
  if (!hasRequiredKeyword) {
    return { relevant: false, score: 0, reason: 'No required keyword found' };
  }
  
  // CHECK 3: Calculate relevance score
  const score = calculateRelevanceScore(name, url, email, cityName);
  
  // Minimum score required: 1 (abbassato da 3)
  if (score < 1) {
    return { relevant: false, score, reason: `Score too low: ${score}/1` };
  }
  
  return { relevant: true, score, reason: `Score: ${score}` };
}

// ========== BUILD SEARCH QUERIES (RIDOTTE A 3 MAX) ==========
function buildSearchQueries(cityName: string, searchType: string): string[] {
  const queries: string[] = [];
  
  // CENTRO: Una sola query combinata per riparazione
  if (searchType === 'centro' || searchType === 'both') {
    queries.push(
      `riparazione smartphone cellulari ${cityName} email contatti`
    );
  }
  
  // CORNER: Due query per negozi operatori (max 2)
  if (searchType === 'corner' || searchType === 'both') {
    queries.push(
      `negozio telefonia TIM Vodafone ${cityName} email`,
      `centro multiservizi telefonia ${cityName} contatti`
    );
  }
  
  return queries; // Max 3 query invece di 5
}

// ========== FIRECRAWL SEARCH WITH RETRY ==========
async function firecrawlSearchWithRetry(query: string, apiKey: string, maxRetries = 2): Promise<SearchResult[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await firecrawlSearch(query, apiKey);
    } catch (error) {
      console.log(`marketing-lead-finder: Retry ${attempt}/${maxRetries} for query: ${query}`);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait 2 seconds before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

// ========== FIRECRAWL WEB SEARCH ==========
async function firecrawlSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondi timeout
    
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 20,
        lang: 'it',
        country: 'IT',
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`marketing-lead-finder: Firecrawl search failed with ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results: SearchResult[] = [];
    
    for (const item of data.data || []) {
      const title = item.title || '';
      const url = item.url || '';
      const content = item.markdown || item.description || '';
      
      // Skip social media, directories, etc.
      if (shouldSkipUrl(url)) continue;
      
      // Extract email from content
      const email = extractEmailFromContent(content);
      const phone = extractPhoneFromContent(content);
      
      if (title && url) {
        results.push({
          name: cleanBusinessName(title),
          email: email || undefined,
          phone: phone || undefined,
          website: url,
          source: 'firecrawl',
        });
      }
    }
    
    return results;
  } catch (err) {
    console.error('marketing-lead-finder: Firecrawl search error:', err);
    return [];
  }
}

// ========== OVERPASS API (OSM) ==========
async function searchOverpass(lat: number, lon: number, radiusKm: number, searchType: string): Promise<SearchResult[]> {
  const radiusMeters = radiusKm * 1000;
  
  let shopTypes: string[] = [];
  
  if (searchType === "centro" || searchType === "both") {
    shopTypes.push(
      'nwr["craft"="electronics_repair"]',
      'nwr["shop"="mobile_phone"]["repair"="yes"]',
      'nwr["repair"~"phone|mobile|smartphone"]',
      'nwr["shop"="repair"]'
    );
  }
  
  // CORNER: Negozi telefonia operatori (TIM, Vodafone, etc.) e multiservizi
  if (searchType === "corner" || searchType === "both") {
    shopTypes.push(
      'nwr["shop"="mobile_phone"]',               // Negozi telefonia generici
      'nwr["shop"="telecommunication"]',          // Operatori telefonici
      'nwr["name"~"TIM|Vodafone|Wind|Iliad|Fastweb|Tiscali",i]', // Negozi operatori
      'nwr["brand"~"TIM|Vodafone|Wind Tre|Iliad|Fastweb",i]',    // Brand operatori
      'nwr["shop"="electronics"]["name"~"phone|cell|telefon",i]', // Elettronica telefonia
      'nwr["amenity"="internet_cafe"]',           // Centri multiservizi/internet point
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      const results: SearchResult[] = [];

      for (const element of data.elements || []) {
        if (!element.tags?.name) continue;

        const tags = element.tags;
        
        results.push({
          name: tags.name,
          phone: tags.phone || tags['contact:phone'] || undefined,
          email: tags.email || tags['contact:email'] || undefined,
          website: tags.website || tags['contact:website'] || tags.url || undefined,
          address: formatOsmAddress(tags),
          source: 'osm',
        });
      }

      return results;

    } catch (err) {
      console.log(`marketing-lead-finder: OSM server ${server} failed`);
    }
  }

  return [];
}

// ========== QUICK EMAIL EXTRACTION (parallel, fast) ==========
async function quickEmailExtract(websiteUrl: string, apiKey: string): Promise<string | null> {
  try {
    const baseUrl = new URL(websiteUrl);
    
    // Skip social media
    const skipDomains = ['facebook', 'instagram', 'twitter', 'linkedin', 'google', 'youtube', 'tiktok', 'paginegialle', 'yelp'];
    if (skipDomains.some(d => baseUrl.hostname.includes(d))) {
      return null;
    }
    
    // Try homepage and contact page in parallel
    const pagesToTry = [
      baseUrl.origin,
      baseUrl.origin + '/contatti',
      baseUrl.origin + '/contact',
    ];
    
    const promises = pagesToTry.map(async (pageUrl) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pageUrl,
            formats: ['markdown'],
            timeout: 3000,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const data = await response.json();
        const content = data.data?.markdown || '';
        
        return extractEmailFromContent(content);
      } catch {
        return null;
      }
    });
    
    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ========== UTILITY FUNCTIONS ==========

function extractEmailFromContent(content: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const allEmails = content.match(emailRegex) || [];
  
  for (const rawEmail of allEmails) {
    const email = rawEmail.toLowerCase();
    
    // Skip fake/generic/system emails
    const skipPatterns = [
      'example', 'test@', 'noreply', 'no-reply', 'donotreply',
      'privacy@', 'gdpr@', 'cookie@', 'abuse@', 'postmaster@',
      'webmaster@', 'hostmaster@', 'mailer-daemon', 'newsletter@',
      '@sentry.io', '@google.com', '@facebook.com', '@twitter.com',
      '@example.com', '@test.com', 'wordpress', 'wix.com', '@w3.org',
      'support@wix', 'support@google', '@email.com'
    ];
    
    if (skipPatterns.some(p => email.includes(p))) {
      continue;
    }
    
    return email;
  }
  
  return null;
}

function extractPhoneFromContent(content: string): string | null {
  // Italian phone patterns
  const phoneRegex = /(?:\+39\s?)?(?:0\d{1,4}[\s.-]?\d{4,8}|\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const matches = content.match(phoneRegex);
  return matches ? matches[0].replace(/[\s.-]/g, '') : null;
}

function shouldSkipUrl(url: string): boolean {
  const skipDomains = [
    'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
    'youtube.com', 'tiktok.com', 'wikipedia.org', 'paginegialle.it',
    'yelp.', 'tripadvisor.', 'google.com', 'amazon.', 'ebay.',
    'subito.it', 'bakeca.it', 'kijiji.it'
  ];
  
  return skipDomains.some(d => url.includes(d));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function cleanBusinessName(title: string): string {
  // Remove common suffixes and clean up
  return title
    .replace(/ - [A-Za-z]+$/, '') // Remove " - City" etc.
    .replace(/\|.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
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

// ========== SCHEDULE FIRST EMAIL ==========
async function scheduleFirstEmail(supabase: any, leadId: string, sequenceId: string) {
  try {
    // Get first step of the sequence
    const { data: steps } = await supabase
      .from("marketing_sequence_steps")
      .select("id, template_id, delay_days, delay_hours, step_number")
      .eq("sequence_id", sequenceId)
      .eq("is_active", true)
      .order("step_number", { ascending: true })
      .limit(1);

    if (steps && steps.length > 0) {
      const step = steps[0];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (step.delay_days || 0));
      scheduledDate.setHours(scheduledDate.getHours() + (step.delay_hours || 0));

      // Insert into marketing_email_queue (the correct table that processor reads from)
      const { error } = await supabase
        .from("marketing_email_queue")
        .insert({
          lead_id: leadId,
          template_id: step.template_id,
          sequence_id: sequenceId,
          step_number: step.step_number || 1,
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending',
        });

      if (error) {
        console.log('marketing-lead-finder: Error scheduling email:', error.message);
      } else {
        console.log(`marketing-lead-finder: ✓ Scheduled first email for lead ${leadId}`);
      }
    } else {
      console.log('marketing-lead-finder: No active steps found in sequence');
    }
  } catch (err) {
    console.log('marketing-lead-finder: Could not schedule email:', err);
  }
}

Deno.serve(handler);
