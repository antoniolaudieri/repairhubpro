import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  id: string;
  text: string;
  emoji?: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedUrl, maxItems = 5 } = await req.json();

    if (!feedUrl) {
      return new Response(
        JSON.stringify({ error: 'Feed URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-rss-feed] Fetching RSS from:', feedUrl);

    // Fetch the RSS feed with a browser-like User-Agent for better compatibility
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Simple XML parsing for RSS items
    const items: RSSItem[] = [];
    
    // Match <item> or <entry> tags (RSS 2.0 and Atom)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>|<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
    
    for (let i = 0; i < Math.min(itemMatches.length, maxItems); i++) {
      const itemXml = itemMatches[i];
      
      // Extract title
      const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : '';
      
      // Extract link for ID
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>|<link[^>]*href="([^"]*)"[^>]*\/?>/i);
      const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
      
      if (title) {
        items.push({
          id: `rss-${i}-${Date.now()}`,
          text: title.length > 100 ? title.substring(0, 97) + '...' : title,
          emoji: '📰',
          source: 'rss'
        });
      }
    }

    // Extract feed title for logging
    const feedTitleMatch = xmlText.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const feedTitle = feedTitleMatch ? feedTitleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, '') : 'Unknown Feed';
    
    console.log(`[fetch-rss-feed] Parsed ${items.length} items from "${feedTitle}"`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        items,
        feedTitle 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch RSS feed';
    console.error('[fetch-rss-feed] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
