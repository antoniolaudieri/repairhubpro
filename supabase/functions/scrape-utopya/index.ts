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
    
    // Parse products from HTML
    const products: Array<{
      name: string;
      price: string;
      priceNumeric: number;
      image: string;
      url: string;
      sku: string;
      brand: string;
      inStock: boolean;
      requiresLogin: boolean;
    }> = [];

    // Match product items using the actual HTML structure
    // <div class="item product product-item listing-item" data-sku="...">
    const productRegex = /<div[^>]*class="[^"]*item product product-item[^"]*"[^>]*data-sku="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
    
    let match;
    while ((match = productRegex.exec(html)) !== null) {
      const sku = match[1];
      const productHtml = match[2];
      
      // Extract product URL
      const urlMatch = productHtml.match(/<a[^>]*href="(https:\/\/www\.utopya\.it\/[^"]+)"[^>]*class="[^"]*product[^"]*photo[^"]*"/i);
      const url = urlMatch ? urlMatch[1] : '';
      
      // Extract image - look for img with class product-image-photo
      const imageMatch = productHtml.match(/<img[^>]*class="[^"]*product-image-photo[^"]*"[^>]*src="([^"]+)"/i) ||
                         productHtml.match(/src="(https:\/\/www\.utopya\.it\/media\/catalog\/product[^"]+)"/i);
      const image = imageMatch ? imageMatch[1] : '';
      
      // Extract product name from alt attribute or from product-item-link
      const altMatch = productHtml.match(/alt="([^"]+)"/i);
      const nameMatch = productHtml.match(/<a[^>]*class="[^"]*product-item-link[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      
      let name = '';
      if (nameMatch) {
        // Remove HTML tags and clean up
        name = nameMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      } else if (altMatch) {
        name = altMatch[1].trim();
      }
      
      // Check for brand labels (Service Pack, ReLife, Pulled, etc.)
      const brandMatch = productHtml.match(/class="[^"]*amlabel[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      let brand = '';
      if (brandMatch) {
        brand = brandMatch[1].replace(/<[^>]+>/g, '').trim();
      }
      
      // Prices require login on Utopya
      const requiresLogin = true;
      const price = 'Accedi per prezzo';
      const priceNumeric = 0;
      
      if (name && url) {
        products.push({
          name,
          price,
          priceNumeric,
          image,
          url,
          sku,
          brand,
          inStock: true, // Assume in stock if listed
          requiresLogin,
        });
      }
    }

    // Alternative parsing if the first method doesn't work
    if (products.length === 0) {
      console.log('Trying alternative parsing method...');
      
      // Find all product links and images
      const productLinkRegex = /<a[^>]*class="[^"]*product-item-link[^"]*name[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const imageRegex = /src="(https:\/\/www\.utopya\.it\/media\/catalog\/product\/cache\/[^"]+\.jpg)"/gi;
      const skuRegex = /data-sku="([^"]+)"/gi;
      
      const links: Array<{url: string, name: string}> = [];
      const images: string[] = [];
      const skus: string[] = [];
      
      let linkMatch;
      while ((linkMatch = productLinkRegex.exec(html)) !== null) {
        const url = linkMatch[1];
        const name = linkMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (url && name && url.includes('utopya.it')) {
          links.push({ url, name });
        }
      }
      
      let imgMatch;
      while ((imgMatch = imageRegex.exec(html)) !== null) {
        images.push(imgMatch[1]);
      }
      
      let skuMatch;
      while ((skuMatch = skuRegex.exec(html)) !== null) {
        skus.push(skuMatch[1]);
      }
      
      console.log(`Found ${links.length} links, ${images.length} images, ${skus.length} skus`);
      
      // Combine the data
      for (let i = 0; i < links.length && i < 30; i++) {
        products.push({
          name: links[i].name,
          price: 'Accedi per prezzo',
          priceNumeric: 0,
          image: images[i] || '',
          url: links[i].url,
          sku: skus[i] || '',
          brand: '',
          inStock: true,
          requiresLogin: true,
        });
      }
    }

    console.log(`Found ${products.length} products`);

    return new Response(
      JSON.stringify({ 
        products: products.slice(0, 30), // Limit to 30 products
        searchUrl: utopyaUrl,
        totalFound: products.length,
        requiresLogin: true,
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
