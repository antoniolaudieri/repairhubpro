import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Utopya: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse products from HTML using regex (simple approach without DOM parser)
    const products: Array<{
      name: string;
      price: string;
      priceNumeric: number;
      image: string;
      url: string;
      brand: string;
      inStock: boolean;
    }> = [];

    // Match product items - looking for product cards
    const productCardRegex = /<li[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    const productMatches = html.matchAll(productCardRegex);

    for (const match of productMatches) {
      const productHtml = match[1];
      
      // Extract product name
      const nameMatch = productHtml.match(/<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      
      // Extract product URL
      const urlMatch = productHtml.match(/<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*href="([^"]+)"/i);
      const url = urlMatch ? urlMatch[1] : '';
      
      // Extract price
      const priceMatch = productHtml.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s]*([€\d.,]+)[\s]*<\/span>/i);
      let price = priceMatch ? priceMatch[1].trim() : '';
      
      // Also try data-price-amount attribute
      if (!price) {
        const dataPriceMatch = productHtml.match(/data-price-amount="([\d.]+)"/i);
        if (dataPriceMatch) {
          price = `€${parseFloat(dataPriceMatch[1]).toFixed(2).replace('.', ',')}`;
        }
      }
      
      // Extract numeric price
      let priceNumeric = 0;
      const numericMatch = price.match(/([\d.,]+)/);
      if (numericMatch) {
        priceNumeric = parseFloat(numericMatch[1].replace(',', '.'));
      }
      
      // Extract image
      const imageMatch = productHtml.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*product-image-photo[^"]*"/i) 
        || productHtml.match(/<img[^>]*class="[^"]*product-image-photo[^"]*"[^>]*src="([^"]+)"/i)
        || productHtml.match(/data-src="([^"]+)"/i);
      const image = imageMatch ? imageMatch[1] : '';
      
      // Extract brand/label
      const brandMatch = productHtml.match(/<div[^>]*class="[^"]*amlabel-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const brand = brandMatch ? brandMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      
      // Check stock status
      const inStock = !productHtml.includes('out-of-stock') && !productHtml.includes('Non disponibile');
      
      if (name && price) {
        products.push({
          name,
          price,
          priceNumeric,
          image,
          url,
          brand,
          inStock,
        });
      }
    }

    // If regex parsing didn't work well, try alternative approach
    if (products.length === 0) {
      // Try to find products with simpler patterns
      const simplePriceRegex = /data-price-amount="([\d.]+)"/gi;
      const simpleNameRegex = /<a[^>]*href="(https:\/\/www\.utopya\.it\/[^"]+)"[^>]*class="[^"]*product-item-link[^"]*"[^>]*>([^<]+)<\/a>/gi;
      
      const priceMatches = [...html.matchAll(simplePriceRegex)];
      const nameMatches = [...html.matchAll(simpleNameRegex)];
      
      const minLength = Math.min(priceMatches.length, nameMatches.length);
      for (let i = 0; i < minLength && i < 20; i++) {
        const priceNumeric = parseFloat(priceMatches[i][1]);
        products.push({
          name: nameMatches[i][2].trim(),
          price: `€${priceNumeric.toFixed(2).replace('.', ',')}`,
          priceNumeric,
          image: '',
          url: nameMatches[i][1],
          brand: '',
          inStock: true,
        });
      }
    }

    console.log(`Found ${products.length} products`);

    return new Response(
      JSON.stringify({ 
        products: products.slice(0, 20), // Limit to 20 products
        searchUrl: utopyaUrl,
        totalFound: products.length 
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
