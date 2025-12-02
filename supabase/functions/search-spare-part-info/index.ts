import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to validate if an image URL is accessible
async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.startsWith('image/');
  } catch {
    return false;
  }
}

// Generate potential image URLs based on common patterns
function generatePotentialUrls(partName: string, brand: string, model: string): string[] {
  const searchTerm = `${partName} ${brand} ${model}`.toLowerCase().trim();
  const slug = searchTerm.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  
  const urls: string[] = [];
  
  // iFixit patterns
  if (brand.toLowerCase() === 'apple' || brand.toLowerCase() === 'iphone') {
    const iphoneModel = model.toLowerCase().replace(/\s+/g, '-');
    urls.push(`https://d3nevzfk7ii3be.cloudfront.net/igi/4/${slug}.jpg`);
  }
  
  return urls;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partName, brand, model } = await req.json();
    
    console.log('Searching spare part info for:', { partName, brand, model });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build a more specific search query
    const searchQuery = `${partName} ${brand || ''} ${model || ''}`.trim();

    const searchPrompt = `You are a spare parts image database. For the query: "${searchQuery}"

Generate 5 realistic Amazon product image URLs for this spare part. Use this EXACT format:
https://m.media-amazon.com/images/I/[ASIN_CODE]._AC_SL1500_.jpg

Where [ASIN_CODE] is a realistic 10-character alphanumeric code starting with "7" or "8" followed by letters and numbers.

Rules:
- Generate 5 different UNIQUE URLs
- Each URL must be a valid Amazon CDN format
- Focus on smartphone/tablet repair parts

Return ONLY a JSON array of URLs, nothing else:
["url1", "url2", "url3", "url4", "url5"]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You generate realistic Amazon CDN image URLs. Return ONLY valid JSON arrays. No explanations.' 
          },
          { role: 'user', content: searchPrompt }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse URLs from AI response
    let urls: string[] = [];
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       content.match(/\[[\s\S]*?\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      urls = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI JSON response:', e);
      // Try to extract URLs with regex as fallback
      const urlMatches = content.match(/https?:\/\/[^\s"]+\.(jpg|jpeg|png|webp)/gi);
      if (urlMatches) {
        urls = urlMatches;
      }
    }

    console.log('Extracted URLs:', urls);

    // Validate URLs and find a working one
    let validImageUrl = '';
    
    for (const url of urls) {
      console.log('Validating URL:', url);
      const isValid = await isImageAccessible(url);
      if (isValid) {
        validImageUrl = url;
        console.log('Found valid image:', url);
        break;
      }
    }

    // If no AI URLs work, try static fallback images based on part type
    if (!validImageUrl) {
      console.log('No valid AI URLs, trying fallback patterns...');
      
      const partLower = partName.toLowerCase();
      
      // Known working placeholder images for common part types
      const fallbacks: Record<string, string> = {
        'display': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        'lcd': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        'screen': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
        'battery': 'https://images.unsplash.com/photo-1609592806585-268cb97f4f8b?w=400',
        'batteria': 'https://images.unsplash.com/photo-1609592806585-268cb97f4f8b?w=400',
        'camera': 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400',
        'fotocamera': 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=400',
        'charger': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
        'caricatore': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
        'connector': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        'connettore': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
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
