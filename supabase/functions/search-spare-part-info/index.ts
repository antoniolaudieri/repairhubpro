import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Search for images using DuckDuckGo
async function searchDuckDuckGoImages(query: string): Promise<string[]> {
  try {
    console.log('Searching DuckDuckGo for:', query);
    
    // First, get the vqd token from DuckDuckGo
    const tokenResponse = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });
    
    const html = await tokenResponse.text();
    const vqdMatch = html.match(/vqd=["']?([^"'&]+)/);
    
    if (!vqdMatch) {
      console.log('Could not extract vqd token');
      return [];
    }
    
    const vqd = vqdMatch[1];
    console.log('Got vqd token:', vqd);
    
    // Now search for images
    const imageSearchUrl = `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`;
    
    const imageResponse = await fetch(imageSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://duckduckgo.com/',
      }
    });
    
    if (!imageResponse.ok) {
      console.log('Image search failed:', imageResponse.status);
      return [];
    }
    
    const data = await imageResponse.json();
    const results = data.results || [];
    
    // Extract image URLs, preferring thumbnail for faster loading
    const imageUrls = results
      .slice(0, 10)
      .map((r: any) => r.thumbnail || r.image)
      .filter((url: string) => url && (url.startsWith('http://') || url.startsWith('https://')));
    
    console.log('Found', imageUrls.length, 'images from DuckDuckGo');
    return imageUrls;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

// Validate if an image URL is accessible
async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partName, brand, model } = await req.json();
    
    console.log('Searching spare part info for:', { partName, brand, model });

    // Build search query - focus on spare part + device info
    const searchTerms = [partName];
    if (brand) searchTerms.push(brand);
    if (model) searchTerms.push(model);
    searchTerms.push('ricambio'); // Add Italian term for spare part
    
    const searchQuery = searchTerms.join(' ');
    console.log('Search query:', searchQuery);

    // Try DuckDuckGo image search first
    let imageUrls = await searchDuckDuckGoImages(searchQuery);
    
    // If no results, try English search
    if (imageUrls.length === 0) {
      const englishQuery = `${partName} ${brand || ''} ${model || ''} replacement part`.trim();
      console.log('Trying English query:', englishQuery);
      imageUrls = await searchDuckDuckGoImages(englishQuery);
    }

    // Validate URLs and find a working one
    let validImageUrl = '';
    
    for (const url of imageUrls) {
      console.log('Validating URL:', url);
      const isValid = await isImageAccessible(url);
      if (isValid) {
        validImageUrl = url;
        console.log('Found valid image:', url);
        break;
      }
    }

    // If no valid URL found, use fallback based on part type
    if (!validImageUrl) {
      console.log('No valid URLs found, using fallback...');
      
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
      };

      for (const [key, url] of Object.entries(fallbacks)) {
        if (partLower.includes(key)) {
          validImageUrl = url;
          console.log('Using fallback image for:', key);
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({ image_url: validImageUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in search-spare-part-info:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        image_url: ''
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});