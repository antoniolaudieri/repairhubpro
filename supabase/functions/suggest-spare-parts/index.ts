import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Search Utopya for parts
async function searchUtopya(query: string): Promise<{ name: string; price: number | null; image: string; url: string }[]> {
  console.log('Searching Utopya for:', query);
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Missing Supabase env vars for Utopya search');
      return [];
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/scrape-utopya`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ searchQuery: query }),
    });

    if (!response.ok) {
      console.log('Utopya search failed:', response.status);
      return [];
    }

    const data = await response.json();
    console.log(`Utopya found ${data.products?.length || 0} products`);
    
    return (data.products || []).slice(0, 10).map((p: any) => ({
      name: p.name,
      price: p.priceNumeric || null,
      image: p.image || '',
      url: p.url,
    }));
  } catch (error) {
    console.error('Utopya search error:', error);
    return [];
  }
}

// Get fallback image based on part type
function getFallbackImage(partName: string): string {
  const partLower = partName.toLowerCase();
  
  const fallbacks: Record<string, string> = {
    'display': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'lcd': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'screen': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'schermo': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'battery': 'https://images.unsplash.com/photo-1609592806585-268cb97f4f8b?w=400',
    'batteria': 'https://images.unsplash.com/photo-1609592806585-268cb97f4f8b?w=400',
    'camera': 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400',
    'fotocamera': 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400',
    'charger': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
    'caricatore': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
    'connector': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    'connettore': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    'vetro': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'glass': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
    'back': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    'cover': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    'scocca': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400',
    'speaker': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400',
    'altoparlante': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400',
    'microfono': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400',
    'microphone': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400',
  };

  for (const [key, url] of Object.entries(fallbacks)) {
    if (partLower.includes(key)) {
      return url;
    }
  }
  
  return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deviceBrand, deviceModel, deviceType, reportedIssue, availableParts } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Create Supabase client to fetch labor prices and services
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch available labor prices and services from database
    const [laborResult, servicesResult] = await Promise.all([
      supabase.from('labor_prices').select('*'),
      supabase.from('additional_services').select('*').eq('is_active', true),
    ]);

    const availableLabor = laborResult.data || [];
    const availableServices = servicesResult.data || [];

    console.log(`Suggesting parts for ${deviceBrand} ${deviceModel} with issue: ${reportedIssue}`);
    console.log(`Available labor: ${availableLabor.length}, services: ${availableServices.length}`);

    // Search Utopya for parts related to the device and issue
    const utopyaSearchQuery = `${deviceBrand || ''} ${deviceModel || ''} ${reportedIssue?.split(' ').slice(0, 3).join(' ') || ''}`.trim();
    const utopyaProducts = await searchUtopya(utopyaSearchQuery);
    console.log(`Utopya products found: ${utopyaProducts.length}`);

    // Build context for AI about available options
    const laborContext = availableLabor.map(l => `- ${l.name} (€${l.price}) - ${l.description || ''} [categoria: ${l.category}, dispositivo: ${l.device_type || 'tutti'}]`).join('\n');
    const servicesContext = availableServices.map(s => `- ${s.name} (€${s.price}) - ${s.description || ''}`).join('\n');
    
    // Include Utopya products in AI context
    const utopyaContext = utopyaProducts.length > 0 
      ? `\nPRODOTTI TROVATI SU UTOPYA (prezzi reali fornitore):\n${utopyaProducts.map(p => `- ${p.name} (${p.price ? '€' + p.price.toFixed(2) : 'prezzo riservato'}) - ${p.url}`).join('\n')}`
      : '';

    const systemPrompt = `Sei un esperto tecnico di riparazione smartphone e dispositivi elettronici.
Analizza il difetto segnalato e suggerisci:
1. I RICAMBI necessari per la riparazione
2. Le LAVORAZIONI (manodopera) appropriate
3. I SERVIZI AGGIUNTIVI utili

Rispondi SOLO con un oggetto JSON con questa struttura:
{
  "parts": [
    {
      "partName": "nome specifico del ricambio (es. Display LCD iPhone 14)",
      "reason": "breve spiegazione del perché questo ricambio è necessario",
      "estimatedPrice": 45.00,
      "category": "Display",
      "utopyaMatch": "nome prodotto Utopya corrispondente (se trovato)"
    }
  ],
  "labors": [
    {
      "laborName": "nome esatto della lavorazione dal listino",
      "reason": "breve spiegazione del perché questa manodopera è necessaria"
    }
  ],
  "services": [
    {
      "serviceName": "nome esatto del servizio dal listino",
      "reason": "breve spiegazione del perché questo servizio potrebbe essere utile"
    }
  ]
}

LISTINO MANODOPERA DISPONIBILE:
${laborContext || 'Nessuna lavorazione predefinita disponibile'}

SERVIZI AGGIUNTIVI DISPONIBILI:
${servicesContext || 'Nessun servizio disponibile'}
${utopyaContext}

IMPORTANTE:
- Per i ricambi, includi sempre marca e modello nel nome
- Per manodopera e servizi, usa ESATTAMENTE i nomi dal listino fornito
- Suggerisci solo lavorazioni/servizi pertinenti al difetto
- Se trovi un prodotto Utopya corrispondente, usa il suo prezzo come estimatedPrice e indica il nome in utopyaMatch
- Suggerisci da 1 a 3 ricambi, 1-2 lavorazioni, e 0-2 servizi aggiuntivi`;

    const userPrompt = `Dispositivo: ${deviceBrand || 'Smartphone'} ${deviceModel || ''} (${deviceType || 'smartphone'})
Difetto segnalato: ${reportedIssue}

Cosa suggerisci per questa riparazione?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', suggestions: [], laborSuggestions: [], serviceSuggestions: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse JSON from response
    let parsedResponse = { parts: [], labors: [], services: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Try to parse old format (array of parts)
      try {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          parsedResponse.parts = JSON.parse(arrayMatch[0]);
        }
      } catch {}
    }

    const suggestions = parsedResponse.parts || [];
    const laborSuggestions = parsedResponse.labors || [];
    const serviceSuggestions = parsedResponse.services || [];

    // Enrich part suggestions with Utopya data and images
    const enrichedSuggestions = suggestions.map((suggestion: any) => {
      // Check if part exists in inventory
      const matchedPart = availableParts?.find((p: any) => 
        p.name.toLowerCase().includes(suggestion.partName.toLowerCase()) ||
        suggestion.partName.toLowerCase().includes(p.name.toLowerCase()) ||
        p.category?.toLowerCase() === suggestion.category?.toLowerCase()
      );

      // Find matching Utopya product
      const utopyaMatch = utopyaProducts.find(up => {
        const upLower = up.name.toLowerCase();
        const suggLower = suggestion.partName.toLowerCase();
        const utopyaMatchName = suggestion.utopyaMatch?.toLowerCase();
        
        return (utopyaMatchName && upLower.includes(utopyaMatchName)) ||
               upLower.includes(suggLower) ||
               suggLower.split(' ').some((word: string) => word.length > 3 && upLower.includes(word));
      });

      // Use Utopya image/price if available
      let imageUrl = utopyaMatch?.image || getFallbackImage(suggestion.partName);
      let price = utopyaMatch?.price || suggestion.estimatedPrice;
      let utopyaUrl = utopyaMatch?.url || null;
      let utopyaName = utopyaMatch?.name || null;

      return {
        ...suggestion,
        imageUrl,
        estimatedPrice: price,
        inStock: !!matchedPart,
        matchedPartId: matchedPart?.id || null,
        stockQuantity: matchedPart?.stock_quantity || 0,
        actualPrice: matchedPart?.selling_price || matchedPart?.cost || price,
        utopyaUrl,
        utopyaName,
        hasUtopyaMatch: !!utopyaMatch,
      };
    });

    // Match labor suggestions with database entries
    const enrichedLaborSuggestions = laborSuggestions.map((suggestion: any) => {
      const matchedLabor = availableLabor.find((l: any) => 
        l.name.toLowerCase().includes(suggestion.laborName.toLowerCase()) ||
        suggestion.laborName.toLowerCase().includes(l.name.toLowerCase())
      );

      return {
        laborName: suggestion.laborName,
        reason: suggestion.reason,
        matched: !!matchedLabor,
        matchedId: matchedLabor?.id || null,
        price: matchedLabor?.price || 0,
        category: matchedLabor?.category || null,
      };
    });

    // Match service suggestions with database entries
    const enrichedServiceSuggestions = serviceSuggestions.map((suggestion: any) => {
      const matchedService = availableServices.find((s: any) => 
        s.name.toLowerCase().includes(suggestion.serviceName.toLowerCase()) ||
        suggestion.serviceName.toLowerCase().includes(s.name.toLowerCase())
      );

      return {
        serviceName: suggestion.serviceName,
        reason: suggestion.reason,
        matched: !!matchedService,
        matchedId: matchedService?.id || null,
        price: matchedService?.price || 0,
      };
    });

    return new Response(JSON.stringify({ 
      suggestions: enrichedSuggestions,
      laborSuggestions: enrichedLaborSuggestions,
      serviceSuggestions: enrichedServiceSuggestions,
      utopyaProducts: utopyaProducts.slice(0, 5), // Include raw Utopya results for reference
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-spare-parts:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [],
      laborSuggestions: [],
      serviceSuggestions: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
