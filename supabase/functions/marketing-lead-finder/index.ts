import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("marketing-lead-finder: Starting lead search");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlApiKey) {
    console.error("marketing-lead-finder: FIRECRAWL_API_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Firecrawl non configurato" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { zoneId, cityName, searchType = "both" } = body;

    // Get zone info if zoneId provided
    let zoneName = cityName;
    let zone = null;
    
    if (zoneId) {
      const { data: zoneData } = await supabase
        .from("marketing_scan_zones")
        .select("*")
        .eq("id", zoneId)
        .single();
      
      if (zoneData) {
        zone = zoneData;
        zoneName = zoneData.name;
      }
    }

    if (!zoneName) {
      return new Response(
        JSON.stringify({ success: false, error: "Specificare città o zona" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`marketing-lead-finder: Searching for leads in "${zoneName}"`);

    // Build search queries based on type
    const searchQueries: string[] = [];
    
    if (searchType === "centro" || searchType === "both") {
      searchQueries.push(
        `riparazione smartphone ${zoneName}`,
        `centro assistenza telefoni ${zoneName}`,
        `riparazione cellulari ${zoneName}`,
        `assistenza Apple iPhone ${zoneName}`,
        `riparazione tablet ${zoneName}`
      );
    }
    
    if (searchType === "corner" || searchType === "both") {
      searchQueries.push(
        `negozio telefonia ${zoneName}`,
        `vendita smartphone ${zoneName}`,
        `negozio elettronica ${zoneName}`,
        `phone store ${zoneName}`
      );
    }

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Search using Firecrawl
    for (const query of searchQueries) {
      try {
        console.log(`marketing-lead-finder: Searching "${query}"`);
        
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            limit: 10,
            lang: 'it',
            country: 'IT',
            scrapeOptions: {
              formats: ['markdown']
            }
          }),
        });

        if (!searchResponse.ok) {
          console.error(`marketing-lead-finder: Search failed for "${query}": ${searchResponse.status}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const results = searchData.data || [];
        
        console.log(`marketing-lead-finder: Found ${results.length} results for "${query}"`);

        for (const result of results) {
          // Skip duplicates
          if (seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);
          
          // Skip irrelevant sites
          const url = result.url?.toLowerCase() || '';
          if (
            url.includes('facebook.com') ||
            url.includes('instagram.com') ||
            url.includes('linkedin.com') ||
            url.includes('twitter.com') ||
            url.includes('youtube.com') ||
            url.includes('wikipedia.org') ||
            url.includes('tripadvisor')
          ) continue;

          allResults.push(result);
        }
      } catch (searchError) {
        console.error(`marketing-lead-finder: Error searching "${query}":`, searchError);
      }
    }

    console.log(`marketing-lead-finder: Total unique results: ${allResults.length}`);

    // Get default funnel stage
    const { data: defaultStage } = await supabase
      .from("marketing_funnel_stages")
      .select("id")
      .eq("stage_order", 1)
      .single();

    // Get email sequence
    const { data: sequence } = await supabase
      .from("marketing_email_sequences")
      .select("id")
      .eq("target_type", searchType === "corner" ? "corner" : "centro")
      .eq("is_active", true)
      .single();

    let leadsCreated = 0;
    const createdLeads: string[] = [];

    // Process results and extract business info
    for (const result of allResults) {
      try {
        // Extract business info from result
        const businessName = extractBusinessName(result.title || '', result.url || '');
        console.log(`marketing-lead-finder: Processing "${businessName}" from ${result.url}`);
        
        if (!businessName || businessName.length < 3) {
          console.log(`marketing-lead-finder: Skipping - name too short: "${businessName}"`);
          continue;
        }

        // Check if lead already exists (exact match or similar)
        const { data: existingLeads } = await supabase
          .from("marketing_leads")
          .select("id, business_name")
          .or(`business_name.ilike.%${businessName.substring(0, 20)}%,website.eq.${result.url}`)
          .limit(1);

        if (existingLeads && existingLeads.length > 0) {
          console.log(`marketing-lead-finder: Lead "${businessName}" already exists as "${existingLeads[0].business_name}"`);
          continue;
        }

        // Extract contact info from markdown if available
        const contactInfo = extractContactInfo(result.markdown || result.description || '');

        // Skip if no email AND no phone
        if (!contactInfo.email && !contactInfo.phone) {
          console.log(`marketing-lead-finder: Skipping "${businessName}" - no email or phone found`);
          continue;
        }

        // Determine business type
        const businessType = determineBusinessType(result.title || '', result.description || '');

        // Create lead
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
            notes: `Trovato cercando: ${result.title}\nURL: ${result.url}`,
          })
          .select()
          .single();

        if (leadError) {
          console.error(`marketing-lead-finder: Error creating lead:`, leadError);
          continue;
        }

        leadsCreated++;
        createdLeads.push(businessName);
        console.log(`marketing-lead-finder: Created lead "${businessName}"`);

        // Schedule first email if sequence exists and email found
        if (sequence?.id && newLead && contactInfo.email) {
          const { data: firstStep } = await supabase
            .from("marketing_sequence_steps")
            .select("*")
            .eq("sequence_id", sequence.id)
            .eq("step_number", 1)
            .single();

          if (firstStep) {
            const scheduledFor = new Date();
            scheduledFor.setHours(scheduledFor.getHours() + (firstStep.delay_hours || 0));
            scheduledFor.setDate(scheduledFor.getDate() + (firstStep.delay_days || 0));

            await supabase
              .from("marketing_email_queue")
              .insert({
                lead_id: newLead.id,
                template_id: firstStep.template_id,
                sequence_id: sequence.id,
                step_number: 1,
                scheduled_for: scheduledFor.toISOString(),
                status: 'pending',
              });
          }
        }

      } catch (resultError) {
        console.error(`marketing-lead-finder: Error processing result:`, resultError);
      }
    }

    // Update zone stats if applicable
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
        message: `Ricerca Firecrawl "${zoneName}" completata: ${leadsCreated} nuovi lead`,
        details: { 
          zone_name: zoneName,
          search_type: searchType,
          results_found: allResults.length,
          leads_created: leadsCreated,
          leads: createdLeads
        },
        zone_id: zone?.id || null,
      });

    console.log(`marketing-lead-finder: Completed. Created ${leadsCreated} leads`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadsCreated,
        resultsFound: allResults.length,
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

// Helper: Extract business name from title/url
function extractBusinessName(title: string, url: string): string {
  // First try: get the first part before dash/pipe
  let name = title.split(/\s*[-|–—]\s*/)[0].trim();
  
  // If that's too long or generic, clean it up
  if (name.length > 60) {
    name = name.substring(0, 60);
  }

  // If name is too short or empty, try from URL
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

  // Capitalize first letter of each word
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .substring(0, 100);
}

// Helper: Extract contact info from text
function extractContactInfo(text: string): { phone: string | null; email: string | null; address: string | null } {
  // Phone patterns (Italian format)
  const phonePatterns = [
    /\+39\s*\d{2,4}[\s.-]?\d{6,8}/g,
    /0\d{1,4}[\s.-]?\d{6,8}/g,
    /3\d{2}[\s.-]?\d{6,7}/g, // Mobile
  ];
  
  let phone: string | null = null;
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      phone = match[0].replace(/[\s.-]/g, '');
      break;
    }
  }

  // Email pattern
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  // Address pattern (Italian)
  const addressMatch = text.match(/(?:via|viale|piazza|corso|largo)\s+[^,\n]{3,50},?\s*\d{5}?\s*[a-zA-Z]+/i);
  const address = addressMatch ? addressMatch[0] : null;

  return { phone, email, address };
}

// Helper: Determine business type
function determineBusinessType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('riparazione') || text.includes('assistenza') || text.includes('repair')) {
    return 'centro_assistenza';
  }
  if (text.includes('negozio') || text.includes('vendita') || text.includes('store')) {
    return 'corner';
  }
  if (text.includes('computer') || text.includes('pc')) {
    return 'computer';
  }
  if (text.includes('elettronica') || text.includes('electronics')) {
    return 'elettronica';
  }
  
  return 'telefonia';
}

serve(handler);
