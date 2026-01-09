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
  queryType?: 'centro' | 'corner';
}

interface LeadStats {
  total: number;
  withEmail: number;
  rejected: number;
  fromSearch: number;
  fromOsm: number;
  enriched: number;
}

interface LeadDetail {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  businessType: 'centro' | 'corner';
  source: 'firecrawl' | 'osm';
  isNew: boolean;
  zone?: string;
  rejectedReason?: string;
}

// ========== BLOCKED EMAIL DOMAINS (corporate/system emails) ==========
const BLOCKED_EMAIL_DOMAINS = [
  // Operatori telefonici (email aziendali, non negozi)
  'tim.it', 'pec.tim.it', 'telecomitalia.it',
  'vodafone.it', 'pec.vodafone.it', 'vodafone.com',
  'wind.it', 'windtre.it', 'pec.windtre.it',
  'tre.it', 'h3g.it',
  'fastweb.it', 'pec.fastweb.it',
  'iliad.it',
  // Brand hardware (non sono negozi locali)
  'samsung.com', 'apple.com', 'huawei.com', 'xiaomi.com', 'oppo.com',
  'daikin.it', 'lg.com', 'sony.com', 'microsoft.com',
  // Istituzionali
  'gov.it', 'edu.it', 'ac.it',
  // Email di sistema
  'sentry.io', 'intercom.io', 'zendesk.com', 'freshdesk.com',
  'mailchimp.com', 'sendgrid.net', 'amazonses.com',
];

// ========== BLOCKED EMAIL PREFIXES ==========
const BLOCKED_EMAIL_PREFIXES = [
  'noreply', 'no-reply', 'do-not-reply', 'donotreply',
  'mailer-daemon', 'postmaster', 'hostmaster', 'webmaster',
  'abuse@', 'spam@', 'privacy@', 'gdpr@', 'cookie@',
  'newsletter@', 'marketing@', 'support@tim', 'support@vodafone',
  'assistenza@tim', 'assistenza@vodafone', 'help@',
  'test@', 'example@', 'demo@', 'admin@',
];

// ========== INVALID BUSINESS NAMES ==========
const INVALID_BUSINESS_NAMES = [
  'site map', 'sitemap', 'mappa del sito',
  'contatti', 'contact', 'contacts', 'contattaci',
  'home', 'homepage', 'index',
  'privacy', 'privacy policy', 'cookie policy', 'cookie',
  'chi siamo', 'about', 'about us',
  'dove siamo', 'location', 'locations',
  'select data', 'loading', 'error', '404', 'not found',
  'menu', 'footer', 'header', 'sidebar',
  'assistenza e supporto', 'centri di assistenza', 'pagina non trovata',
  'pec tim', 'pec vodafone', 'servizio clienti',
  'termini e condizioni', 'terms', 'legal',
  'cerca', 'search', 'ricerca',
  'login', 'accedi', 'registrati', 'signup',
  'carrello', 'cart', 'checkout',
];

// ========== VALIDATE EMAIL RIGOROUSLY ==========
function isValidEmail(email: string | undefined): { valid: boolean; reason: string } {
  if (!email) {
    return { valid: false, reason: 'Email mancante' };
  }
  
  const emailLower = email.toLowerCase().trim();
  
  // Check basic format with strict regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(emailLower)) {
    return { valid: false, reason: `Formato email invalido: ${email}` };
  }
  
  // Extract domain
  const domain = emailLower.split('@')[1];
  if (!domain) {
    return { valid: false, reason: 'Dominio mancante' };
  }
  
  // Check blocked domains
  for (const blockedDomain of BLOCKED_EMAIL_DOMAINS) {
    if (domain === blockedDomain || domain.endsWith('.' + blockedDomain)) {
      return { valid: false, reason: `Dominio bloccato: ${blockedDomain}` };
    }
  }
  
  // Check blocked prefixes
  for (const prefix of BLOCKED_EMAIL_PREFIXES) {
    if (emailLower.startsWith(prefix.toLowerCase())) {
      return { valid: false, reason: `Prefisso bloccato: ${prefix}` };
    }
  }
  
  // Check for multiple @ signs
  if ((email.match(/@/g) || []).length > 1) {
    return { valid: false, reason: 'Email multiple in un campo' };
  }
  
  // Check minimum length
  if (emailLower.length < 6) {
    return { valid: false, reason: 'Email troppo corta' };
  }
  
  // Check for suspicious patterns
  if (emailLower.includes('..') || emailLower.startsWith('.') || emailLower.endsWith('.')) {
    return { valid: false, reason: 'Formato email sospetto' };
  }
  
  return { valid: true, reason: 'Email valida' };
}

// ========== VALIDATE BUSINESS NAME RIGOROUSLY ==========
function isValidBusinessName(name: string | undefined): { valid: boolean; reason: string } {
  if (!name) {
    return { valid: false, reason: 'Nome mancante' };
  }
  
  const nameLower = name.toLowerCase().trim();
  
  // Check minimum length
  if (nameLower.length < 4) {
    return { valid: false, reason: 'Nome troppo corto (min 4 caratteri)' };
  }
  
  // Check maximum length (prevents garbage)
  if (name.length > 100) {
    return { valid: false, reason: 'Nome troppo lungo (max 100 caratteri)' };
  }
  
  // Check against invalid names
  for (const invalidName of INVALID_BUSINESS_NAMES) {
    if (nameLower === invalidName || nameLower.includes(invalidName)) {
      return { valid: false, reason: `Nome invalido: contiene "${invalidName}"` };
    }
  }
  
  // Check if starts with common web page prefixes
  const webPrefixes = ['contatti -', 'contact -', 'home -', 'chi siamo -', '- contatti', '- home', '| contatti', '| home'];
  for (const prefix of webPrefixes) {
    if (nameLower.includes(prefix)) {
      return { valid: false, reason: `Nome è titolo pagina web: ${prefix}` };
    }
  }
  
  // Check if starts with special characters (not a real business name)
  if (/^[^a-zA-Z0-9àèéìòù]/.test(name)) {
    return { valid: false, reason: 'Nome inizia con carattere speciale' };
  }
  
  // Check for too many numbers (likely not a business name)
  const numbers = name.match(/\d/g);
  if (numbers && numbers.length > 5) {
    return { valid: false, reason: 'Troppe cifre nel nome' };
  }
  
  return { valid: true, reason: 'Nome valido' };
}

// ========== CLEAN AND VALIDATE EMAIL ==========
function cleanEmail(rawEmail: string | undefined): string | null {
  if (!rawEmail) return null;
  
  // Take only the first email if multiple are present
  let email = rawEmail.split(';')[0].split(',')[0].split(' ')[0].trim().toLowerCase();
  
  // Remove any trailing punctuation
  email = email.replace(/[.,;:!?]$/, '');
  
  // Validate
  const validation = isValidEmail(email);
  if (!validation.valid) {
    console.log(`marketing-lead-finder: Email rejected: "${email}" - ${validation.reason}`);
    return null;
  }
  
  return email;
}

// ========== CLEAN BUSINESS NAME ==========
function cleanBusinessName(rawName: string): string {
  let name = rawName;
  
  // Remove common web page suffixes/prefixes
  const removePatterns = [
    / - [A-Za-zÀ-ÿ]+ \| .*$/i,
    / \| [A-Za-zÀ-ÿ]+.*$/i,
    / - Contatti.*$/i,
    / - Home.*$/i,
    / - Chi siamo.*$/i,
    /^Contatti - /i,
    /^Home - /i,
    /^Chi siamo - /i,
    / – .*$/,
    / — .*$/,
  ];
  
  for (const pattern of removePatterns) {
    name = name.replace(pattern, '');
  }
  
  // Clean up whitespace
  name = name.replace(/\s+/g, ' ').trim();
  
  // Limit length
  if (name.length > 100) {
    name = name.substring(0, 100).trim();
  }
  
  // Remove leading special characters
  name = name.replace(/^[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ]+/, '');
  
  return name.trim();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-lead-finder: Starting STRICT lead search (only valid emails)");
  
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

    // Get BOTH sequences (centro and corner)
    const { data: centroSequence } = await supabase
      .from("marketing_email_sequences")
      .select("id")
      .eq("target_type", "centro")
      .eq("is_active", true)
      .single();

    const { data: cornerSequence } = await supabase
      .from("marketing_email_sequences")
      .select("id")
      .eq("target_type", "corner")
      .eq("is_active", true)
      .single();
    
    console.log(`marketing-lead-finder: Sequences loaded - Centro: ${centroSequence?.id || 'none'}, Corner: ${cornerSequence?.id || 'none'}`);

    // Stats tracking
    const stats: LeadStats = {
      total: 0,
      withEmail: 0,
      rejected: 0,
      fromSearch: 0,
      fromOsm: 0,
      enriched: 0,
    };
    
    const allResults: SearchResult[] = [];
    const leadsDetail: LeadDetail[] = [];
    let duplicatesSkipped = 0;

    // ========== PHASE 1: FIRECRAWL SEARCH (PRIMARY - finds sites WITH email) ==========
    if (firecrawlApiKey) {
      console.log(`marketing-lead-finder: [PHASE 1] Firecrawl Search for "${zoneName}"...`);
      
      const searchQueries = buildSearchQueries(zoneName, searchType);
      console.log(`marketing-lead-finder: Executing ${searchQueries.length} queries sequentially...`);
      
      for (let i = 0; i < searchQueries.length; i++) {
        const { query, type: queryType } = searchQueries[i];
        console.log(`marketing-lead-finder: Query ${i + 1}/${searchQueries.length} (${queryType}): "${query}"`);
        
        try {
          const searchResults = await firecrawlSearchWithRetry(query, firecrawlApiKey);
          console.log(`marketing-lead-finder: ✓ Found ${searchResults.length} results`);
          
          for (const result of searchResults) {
            // Check if not already added
            const isDupe = allResults.some(r => 
              r.website === result.website || 
              r.name.toLowerCase() === result.name.toLowerCase()
            );
            if (!isDupe) {
              result.queryType = queryType;
              allResults.push(result);
              stats.fromSearch++;
            }
          }
        } catch (err) {
          console.log(`marketing-lead-finder: ✗ Query failed after retries: ${query}`);
        }
        
        // Delay 3 seconds between queries
        if (i < searchQueries.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      console.log(`marketing-lead-finder: [PHASE 1] Found ${allResults.length} candidates from search`);
    } else {
      console.log(`marketing-lead-finder: No Firecrawl API key, skipping web search`);
    }

    // ========== PHASE 2: OSM BACKUP (finds local shops) ==========
    if (lat && lon) {
      console.log(`marketing-lead-finder: [PHASE 2] OSM search (lat: ${lat}, lon: ${lon}, radius: ${radiusKm}km)...`);
      
      const osmShops = await searchOverpass(lat, lon, radiusKm, searchType);
      console.log(`marketing-lead-finder: OSM found ${osmShops.length} shops`);
      
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

    // ========== PHASE 3: ENRICHMENT (for leads with website but no email) ==========
    if (firecrawlApiKey) {
      const toEnrich = allResults.filter(r => r.website && !r.email).slice(0, 50);
      
      if (toEnrich.length > 0) {
        console.log(`marketing-lead-finder: [PHASE 3] Enrichment for ${toEnrich.length} leads...`);
        
        const batchSize = 5;
        for (let i = 0; i < toEnrich.length; i += batchSize) {
          const batch = toEnrich.slice(i, i + batchSize);
          
          const enrichPromises = batch.map(async (result) => {
            try {
              const email = await quickEmailExtract(result.website!, firecrawlApiKey);
              if (email) {
                // Validate the extracted email
                const cleanedEmail = cleanEmail(email);
                if (cleanedEmail) {
                  result.email = cleanedEmail;
                  stats.enriched++;
                  console.log(`marketing-lead-finder: ✓ Enriched "${result.name}" with ${cleanedEmail}`);
                }
              }
            } catch {
              // Silent fail
            }
          });
          
          await Promise.allSettled(enrichPromises);
        }
        
        console.log(`marketing-lead-finder: [PHASE 3] Enriched ${stats.enriched} leads with valid email`);
      }
    }

    // ========== PHASE 4: STRICT VALIDATION + SAVE LEADS ==========
    console.log(`marketing-lead-finder: [PHASE 4] STRICT validation - only leads with VALID email...`);
    
    for (const result of allResults) {
      try {
        // STEP 1: Clean and validate business name
        const cleanedName = cleanBusinessName(result.name);
        const nameValidation = isValidBusinessName(cleanedName);
        
        if (!nameValidation.valid) {
          stats.rejected++;
          leadsDetail.push({
            name: result.name,
            email: result.email,
            businessType: result.queryType || 'corner',
            source: result.source,
            isNew: false,
            zone: zoneName,
            rejectedReason: nameValidation.reason,
          });
          console.log(`marketing-lead-finder: ✗ REJECTED "${result.name}" - ${nameValidation.reason}`);
          continue;
        }
        
        // STEP 2: Clean and validate email - THIS IS MANDATORY
        const cleanedEmail = cleanEmail(result.email);
        
        if (!cleanedEmail) {
          stats.rejected++;
          leadsDetail.push({
            name: cleanedName,
            email: result.email,
            phone: result.phone,
            website: result.website,
            businessType: result.queryType || 'corner',
            source: result.source,
            isNew: false,
            zone: zoneName,
            rejectedReason: 'Email mancante o invalida',
          });
          console.log(`marketing-lead-finder: ✗ REJECTED "${cleanedName}" - Email mancante o invalida: ${result.email || 'null'}`);
          continue;
        }
        
        // STEP 3: Check for duplicates in database (by email - most reliable)
        const { data: existingByEmail } = await supabase
          .from("marketing_leads")
          .select("id")
          .eq("email", cleanedEmail)
          .limit(1);

        if (existingByEmail && existingByEmail.length > 0) {
          duplicatesSkipped++;
          leadsDetail.push({
            name: cleanedName,
            email: cleanedEmail,
            phone: result.phone,
            website: result.website,
            businessType: result.queryType || determineBusinessType(cleanedName, result.website || ''),
            source: result.source,
            isNew: false,
            zone: zoneName,
            rejectedReason: 'Duplicato (email già esistente)',
          });
          console.log(`marketing-lead-finder: ✗ DUPLICATE "${cleanedName}" - email ${cleanedEmail} already exists`);
          continue;
        }

        // STEP 4: Determine business type
        const businessType = result.queryType || determineBusinessType(cleanedName, result.website || '');
        
        // Select correct sequence based on business type
        const sequenceToUse = businessType === 'centro' ? centroSequence : cornerSequence;
        
        console.log(`marketing-lead-finder: ✓ VALID Lead "${cleanedName}" -> type: ${businessType}, email: ${cleanedEmail}`);

        // STEP 5: Insert lead (only with valid email)
        const { data: newLead, error: leadError } = await supabase
          .from("marketing_leads")
          .insert({
            source: result.source === 'osm' ? 'openstreetmap' : 'web_search',
            business_name: cleanedName,
            website: result.website || null,
            phone: result.phone || null,
            email: cleanedEmail, // Guaranteed to be valid
            address: result.address || `${zoneName}, Italia`,
            business_type: businessType,
            status: 'new', // Always 'new' since we have valid email
            auto_processed: true,
            scan_zone_id: zone?.id || null,
            funnel_stage_id: defaultStage?.id || null,
            current_sequence_id: sequenceToUse?.id || null,
            current_step: 0,
            notes: `Source: ${result.source}`,
          })
          .select()
          .single();

        if (leadError) {
          console.error(`marketing-lead-finder: Error saving "${cleanedName}":`, leadError.message);
          continue;
        }

        stats.total++;
        stats.withEmail++;
        
        // Add to leads detail
        leadsDetail.push({
          id: newLead.id,
          name: cleanedName,
          email: cleanedEmail,
          phone: result.phone,
          website: result.website,
          businessType: businessType,
          source: result.source,
          isNew: true,
          zone: zoneName,
        });
        
        // Schedule first email
        if (sequenceToUse?.id && newLead) {
          await scheduleFirstEmail(supabase, newLead.id, sequenceToUse.id);
        }
        
        console.log(`marketing-lead-finder: ✓ SAVED "${cleanedName}" with email ${cleanedEmail}`);

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
        message: `Scansione "${zoneName}": ${stats.total} lead validi (${stats.rejected} rifiutati, ${duplicatesSkipped} duplicati)`,
        details: { 
          zone_name: zoneName,
          search_type: searchType,
          ...stats,
          duplicatesSkipped,
        },
        zone_id: zone?.id || null,
      });

    console.log(`marketing-lead-finder: DONE - ${stats.total} valid leads saved (${stats.rejected} rejected, ${duplicatesSkipped} duplicates)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadsCreated: stats.total,
        leadsWithEmail: stats.withEmail,
        rejected: stats.rejected,
        enriched: stats.enriched,
        fromSearch: stats.fromSearch,
        fromOsm: stats.fromOsm,
        leadsDetail,
        duplicatesSkipped,
        message: `Salvati ${stats.total} lead validi (${stats.rejected} rifiutati, ${duplicatesSkipped} duplicati)`
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

// ========== DETERMINE BUSINESS TYPE FROM NAME/URL ==========
function determineBusinessType(name: string, url: string): 'centro' | 'corner' {
  const nameLower = name.toLowerCase();
  const urlLower = (url || '').toLowerCase();
  const combined = nameLower + ' ' + urlLower;
  
  const centroKeywords = [
    'riparazion', 'assistenza', 'ripara', 'laboratorio', 'tecnico',
    'service', 'fix', 'repair', 'aggiust', 'ricambi', 'centro assistenza',
    'samsung service', 'apple service', 'huawei service', 'iphone repair',
    'display', 'schermo', 'batteria'
  ];
  
  const cornerKeywords = [
    'negozio', 'store', 'shop', 'punto vendita', 'multiservizi',
    'tim', 'vodafone', 'wind', 'tre', 'iliad', 'fastweb', 'ho.mobile', 'kena', 'postemobile',
    'telefonia', 'accessori', 'vendita', 'rivenditore', 'dealer'
  ];
  
  const centroScore = centroKeywords.filter(k => combined.includes(k)).length;
  const cornerScore = cornerKeywords.filter(k => combined.includes(k)).length;
  
  if (centroScore > cornerScore) return 'centro';
  return 'corner';
}

// ========== BUILD SEARCH QUERIES ==========
function buildSearchQueries(cityName: string, searchType: string): { query: string; type: 'centro' | 'corner' }[] {
  const queries: { query: string; type: 'centro' | 'corner' }[] = [];
  
  if (searchType === 'centro' || searchType === 'both') {
    queries.push({
      query: `riparazione smartphone cellulari ${cityName} email contatti`,
      type: 'centro'
    });
  }
  
  if (searchType === 'corner' || searchType === 'both') {
    queries.push({
      query: `negozio telefonia TIM Vodafone ${cityName} email`,
      type: 'corner'
    }, {
      query: `centro multiservizi telefonia ${cityName} contatti`,
      type: 'corner'
    });
  }
  
  return queries;
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
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

// ========== FIRECRAWL WEB SEARCH ==========
async function firecrawlSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
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
      
      if (shouldSkipUrl(url)) continue;
      
      const rawEmail = extractEmailFromContent(content);
      const phone = extractPhoneFromContent(content);
      
      if (title && url) {
        results.push({
          name: cleanBusinessName(title),
          email: rawEmail || undefined,
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
  
  if (searchType === "corner" || searchType === "both") {
    shopTypes.push(
      'nwr["shop"="mobile_phone"]',
      'nwr["shop"="telecommunication"]',
      'nwr["name"~"TIM|Vodafone|Wind|Iliad|Fastweb|Tiscali",i]',
      'nwr["brand"~"TIM|Vodafone|Wind Tre|Iliad|Fastweb",i]',
      'nwr["shop"="electronics"]["name"~"phone|cell|telefon",i]',
      'nwr["amenity"="internet_cafe"]',
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

// ========== QUICK EMAIL EXTRACTION ==========
async function quickEmailExtract(websiteUrl: string, apiKey: string): Promise<string | null> {
  try {
    const baseUrl = new URL(websiteUrl);
    
    const skipDomains = ['facebook', 'instagram', 'twitter', 'linkedin', 'google', 'youtube', 'tiktok', 'paginegialle', 'yelp'];
    if (skipDomains.some(d => baseUrl.hostname.includes(d))) {
      return null;
    }
    
    const pagesToTry = [
      baseUrl.origin,
      baseUrl.origin + '/contatti',
      baseUrl.origin + '/contact',
      baseUrl.origin + '/contattaci',
      baseUrl.origin + '/chi-siamo',
      baseUrl.origin + '/about',
      baseUrl.origin + '/dove-siamo',
      baseUrl.origin + '/info',
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
            formats: ['markdown', 'html'],
            timeout: 4000,
          }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        const data = await response.json();
        const markdown = data.data?.markdown || '';
        const html = data.data?.html || '';
        
        const emailFromMarkdown = extractEmailFromContent(markdown);
        if (emailFromMarkdown) return emailFromMarkdown;
        
        const emailFromMailto = extractMailtoLinks(html);
        if (emailFromMailto) return emailFromMailto;
        
        return extractEmailFromContent(html);
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
  const allEmails: string[] = [];
  
  const standardMatches = content.match(emailRegex) || [];
  allEmails.push(...standardMatches);
  
  // Obfuscated emails
  const obfuscatedPatterns = [
    /([a-zA-Z0-9._%+-]+)\s*\[at\]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+)\s*\(at\)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+)\s*\[chiocciola\]\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
  ];
  
  for (const pattern of obfuscatedPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match.length >= 3) {
        const reconstructed = `${match[1]}@${match[2]}`;
        allEmails.push(reconstructed);
      }
    }
  }
  
  // Skip fake/system emails
  const skipPatterns = [
    'example', 'test@', 'noreply', 'no-reply', 'donotreply',
    'privacy@', 'gdpr@', 'cookie@', 'abuse@', 'postmaster@',
    'webmaster@', 'hostmaster@', 'mailer-daemon', 'newsletter@',
    '@sentry.io', '@google.com', '@facebook.com', '@twitter.com',
    '@example.com', '@test.com', 'wordpress', 'wix.com', '@w3.org',
    'support@wix', 'support@google', '@email.com'
  ];
  
  // Filter and return first valid email
  for (const rawEmail of allEmails) {
    const email = rawEmail.toLowerCase().trim();
    
    if (skipPatterns.some(p => email.includes(p))) {
      continue;
    }
    
    // Return the first email that passes basic checks
    if (email.length >= 6 && email.includes('@') && email.includes('.')) {
      return email;
    }
  }
  
  return null;
}

function extractMailtoLinks(html: string): string | null {
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches: string[] = [];
  let match;
  
  while ((match = mailtoRegex.exec(html)) !== null) {
    matches.push(match[1].toLowerCase());
  }
  
  if (matches.length === 0) return null;
  
  return matches[0];
}

function extractPhoneFromContent(content: string): string | null {
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
