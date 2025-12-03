import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Common browser headers to avoid bot detection
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

interface UtopyaProduct {
  name: string;
  price: string;
  priceNumeric: number;
  image: string;
  url: string;
  sku: string;
  brand: string;
  inStock: boolean;
  requiresLogin: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();
    
    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Encode search query for URL
    const encodedQuery = encodeURIComponent(searchQuery).replace(/%20/g, '+');
    const utopyaUrl = `https://www.utopya.it/catalogsearch/result/?q=${encodedQuery}`;
    
    console.log('Fetching Utopya URL:', utopyaUrl);

    // Fetch the Utopya search results page
    const response = await fetch(utopyaUrl, {
      headers: browserHeaders,
    });

    if (!response.ok) {
      console.error(`Failed to fetch Utopya: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch Utopya: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    // Log a small sample of the HTML for debugging
    const sampleStart = html.indexOf('product-item');
    if (sampleStart > -1) {
      console.log('Found product-item at position:', sampleStart);
      console.log('Sample HTML around product:', html.substring(sampleStart, sampleStart + 500));
    } else {
      console.log('No product-item found in HTML');
      // Check if there's a "no results" message
      if (html.includes('Nessun risultato') || html.includes('nessun prodotto')) {
        console.log('Page indicates no results found');
      }
    }

    const products: UtopyaProduct[] = [];

    // Method 1: Look for product links with data-product-sku attribute
    const productLinkRegex = /<a[^>]*href="(https:\/\/www\.utopya\.it\/[^"]+)"[^>]*class="[^"]*product[^"]*"[^>]*>/gi;
    
    // Method 2: Parse product items from the listing
    // Look for the product grid/list items
    const productItemRegex = /class="[^"]*product-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="(https:\/\/www\.utopya\.it\/[^"]+\.html)"[^>]*>[\s\S]*?(?:alt="([^"]*)")?[\s\S]*?<\/li>/gi;
    
    // Method 3: Extract from JSON-LD structured data if available
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        console.log('Found JSON-LD data');
        if (jsonData.itemListElement) {
          for (const item of jsonData.itemListElement) {
            if (item.item && item.item.name) {
              products.push({
                name: item.item.name,
                price: item.item.offers?.price ? `€${item.item.offers.price}` : 'Accedi per prezzo',
                priceNumeric: parseFloat(item.item.offers?.price || '0'),
                image: item.item.image || '',
                url: item.item.url || item.item['@id'] || '',
                sku: item.item.sku || '',
                brand: item.item.brand?.name || '',
                inStock: true,
                requiresLogin: !item.item.offers?.price,
              });
            }
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD:', e);
      }
    }

    // Method 4: Parse from product grid using more flexible patterns
    if (products.length === 0) {
      // Look for product URLs
      const urlMatches = html.matchAll(/href="(https:\/\/www\.utopya\.it\/[a-z0-9\-]+\.html)"/gi);
      const productUrls = new Set<string>();
      
      for (const match of urlMatches) {
        const url = match[1];
        // Filter out non-product URLs
        if (!url.includes('/checkout') && 
            !url.includes('/customer') && 
            !url.includes('/catalogsearch') &&
            !url.includes('/wishlist') &&
            !url.includes('/privacy') &&
            !url.includes('/terms')) {
          productUrls.add(url);
        }
      }
      
      console.log('Found product URLs:', productUrls.size);
      
      // Extract product names from alt tags near URLs
      for (const url of productUrls) {
        // Try to find product info around this URL
        const urlEscaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const contextRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?(?:<img[^>]*alt="([^"]+)")?`, 'i');
        const contextMatch = html.match(contextRegex);
        
        // Extract name from URL if not found in HTML
        let name = '';
        if (contextMatch && contextMatch[1]) {
          name = contextMatch[1];
        } else {
          // Parse name from URL slug
          const slug = url.replace('https://www.utopya.it/', '').replace('.html', '');
          name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Find image near this product
        const imgRegex = new RegExp(`<img[^>]*src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"[^>]*alt="[^"]*${name.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
        const imgMatch = html.match(imgRegex);
        const image = imgMatch ? imgMatch[1] : '';
        
        if (name && url) {
          products.push({
            name,
            price: 'Accedi per prezzo',
            priceNumeric: 0,
            image,
            url,
            sku: '',
            brand: '',
            inStock: true,
            requiresLogin: true,
          });
        }
      }
    }

    // Method 5: Try to extract from script tags containing product data
    if (products.length === 0) {
      const scriptDataRegex = /var\s+productData\s*=\s*(\[[\s\S]*?\]);/i;
      const scriptMatch = html.match(scriptDataRegex);
      if (scriptMatch) {
        try {
          const scriptProducts = JSON.parse(scriptMatch[1]);
          console.log('Found script product data:', scriptProducts.length);
          for (const p of scriptProducts) {
            products.push({
              name: p.name || '',
              price: p.price ? `€${p.price}` : 'Accedi per prezzo',
              priceNumeric: parseFloat(p.price || '0'),
              image: p.image || '',
              url: p.url || '',
              sku: p.sku || '',
              brand: p.brand || '',
              inStock: p.inStock !== false,
              requiresLogin: !p.price,
            });
          }
        } catch (e) {
          console.log('Failed to parse script data:', e);
        }
      }
    }

    // Remove duplicates based on URL
    const uniqueProducts = Array.from(
      new Map(products.map(p => [p.url, p])).values()
    );

    console.log(`Found ${uniqueProducts.length} unique products`);

    return new Response(
      JSON.stringify({ 
        products: uniqueProducts.slice(0, 30),
        searchUrl: utopyaUrl,
        totalFound: uniqueProducts.length,
        requiresLogin: true,
        isAuthenticated: false,
        message: 'I prezzi su Utopya richiedono login. Clicca sui prodotti per vedere i prezzi sul sito.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Utopya:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
