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
  'Accept-Encoding': 'identity',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
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

// Login to Utopya and get session cookies
async function loginToUtopya(): Promise<{ cookies: string; isAuthenticated: boolean }> {
  const username = Deno.env.get('UTOPYA_USERNAME');
  const password = Deno.env.get('UTOPYA_PASSWORD');
  
  if (!username || !password) {
    console.log('Utopya credentials not configured');
    return { cookies: '', isAuthenticated: false };
  }
  
  console.log('Attempting Utopya login...');
  
  try {
    // First, get the login page to extract form_key
    const loginPageResponse = await fetch('https://www.utopya.it/customer/account/login/', {
      headers: browserHeaders,
    });
    
    if (!loginPageResponse.ok) {
      console.error('Failed to fetch login page:', loginPageResponse.status);
      return { cookies: '', isAuthenticated: false };
    }
    
    const loginPageHtml = await loginPageResponse.text();
    
    // Extract form_key from login page
    const formKeyMatch = loginPageHtml.match(/name="form_key"\s+value="([^"]+)"/i) ||
                         loginPageHtml.match(/form_key.*?value="([^"]+)"/i);
    
    if (!formKeyMatch) {
      console.error('Could not find form_key in login page');
      return { cookies: '', isAuthenticated: false };
    }
    
    const formKey = formKeyMatch[1];
    
    // Get cookies from login page response
    const initialCookies = loginPageResponse.headers.get('set-cookie') || '';
    
    // Perform login
    const loginFormData = new URLSearchParams();
    loginFormData.append('form_key', formKey);
    loginFormData.append('login[username]', username);
    loginFormData.append('login[password]', password);
    loginFormData.append('send', '');
    
    const loginResponse = await fetch('https://www.utopya.it/customer/account/loginPost/', {
      method: 'POST',
      headers: {
        ...browserHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initialCookies.split(',').map(c => c.split(';')[0]).join('; '),
        'Origin': 'https://www.utopya.it',
        'Referer': 'https://www.utopya.it/customer/account/login/',
      },
      body: loginFormData.toString(),
      redirect: 'manual',
    });
    
    console.log('Login response status:', loginResponse.status);
    
    // Collect all cookies
    const loginCookies = loginResponse.headers.get('set-cookie') || '';
    const allCookies = [initialCookies, loginCookies]
      .filter(Boolean)
      .join(', ')
      .split(',')
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    
    const isAuthenticated = loginResponse.status === 302 || loginResponse.status === 301;
    console.log('Login authenticated:', isAuthenticated);
    
    return { cookies: allCookies, isAuthenticated };
  } catch (error) {
    console.error('Login error:', error);
    return { cookies: '', isAuthenticated: false };
  }
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

    // Try to login first
    const { cookies, isAuthenticated } = await loginToUtopya();

    // Encode search query for URL
    const encodedQuery = encodeURIComponent(searchQuery).replace(/%20/g, '+');
    const utopyaUrl = `https://www.utopya.it/catalogsearch/result/?q=${encodedQuery}`;
    
    console.log('Fetching Utopya URL:', utopyaUrl);

    // Fetch the search results with session cookies
    const searchHeaders: Record<string, string> = { ...browserHeaders };
    if (cookies) {
      searchHeaders['Cookie'] = cookies;
    }
    
    const response = await fetch(utopyaUrl, {
      headers: searchHeaders,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Utopya: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const products: UtopyaProduct[] = [];

    // Method 1: Look for product grid items with class "product-item"
    // Utopya uses a standard Magento structure
    const productGridMatch = html.match(/class="products[^"]*product-items[^"]*"[^>]*>([\s\S]*?)<\/ol>/i) ||
                            html.match(/class="[^"]*search[^"]*results[^"]*"[^>]*>([\s\S]*?)<\/(?:ol|ul|div)>/i);
    
    if (productGridMatch) {
      console.log('Found product grid');
      const gridHtml = productGridMatch[1] || productGridMatch[0];
      
      // Extract individual product items
      const productItemRegex = /<li[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
      const productItems = gridHtml.matchAll(productItemRegex);
      
      for (const item of productItems) {
        const itemHtml = item[1];
        
        // Extract product URL
        const urlMatch = itemHtml.match(/href="(https:\/\/www\.utopya\.it\/[^"]+\.html)"/i);
        if (!urlMatch) continue;
        const url = urlMatch[1];
        
        // Skip category URLs
        if (url.includes('/category/') || url.includes('/checkout/') || url.includes('/customer/')) continue;
        
        // Extract product name from link title or alt
        const nameMatch = itemHtml.match(/class="[^"]*product-item-link[^"]*"[^>]*>([^<]+)</i) ||
                         itemHtml.match(/alt="([^"]+)"/i) ||
                         itemHtml.match(/title="([^"]+)"/i);
        const name = nameMatch ? nameMatch[1].trim() : '';
        
        if (!name) continue;
        
        // Extract image
        const imgMatch = itemHtml.match(/src="(https:\/\/www\.utopya\.it\/media\/catalog\/product[^"]+)"/i) ||
                        itemHtml.match(/data-src="(https:\/\/www\.utopya\.it\/media\/catalog\/product[^"]+)"/i);
        const image = imgMatch ? imgMatch[1] : '';
        
        // Extract price (only visible if authenticated)
        let price = 'Accedi per prezzo';
        let priceNumeric = 0;
        const priceMatch = itemHtml.match(/data-price-amount="([0-9.]+)"/i) ||
                          itemHtml.match(/class="[^"]*price[^"]*"[^>]*>€?\s*([0-9]+[.,][0-9]{2})/i);
        if (priceMatch) {
          priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
          if (priceNumeric > 0) {
            price = `€${priceNumeric.toFixed(2)}`;
          }
        }
        
        // Extract SKU if available
        const skuMatch = itemHtml.match(/data-sku="([^"]+)"/i) ||
                        itemHtml.match(/sku['":\s]+['"]?([A-Z0-9\-]+)/i);
        const sku = skuMatch ? skuMatch[1] : '';
        
        // Extract brand label
        const brandMatch = itemHtml.match(/class="[^"]*amlabel[^"]*"[^>]*>([^<]+)</i);
        const brand = brandMatch ? brandMatch[1].trim() : '';
        
        products.push({
          name,
          price,
          priceNumeric,
          image,
          url,
          sku,
          brand,
          inStock: true,
          requiresLogin: priceNumeric === 0,
        });
      }
    }

    // Method 2: Fallback - look for JSON-LD structured data
    if (products.length === 0) {
      console.log('Trying JSON-LD method...');
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      for (const jsonLdMatch of jsonLdMatches) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
            for (const item of jsonData.itemListElement) {
              if (item.item && item.item.name) {
                const itemPrice = item.item.offers?.price;
                products.push({
                  name: item.item.name,
                  price: itemPrice ? `€${parseFloat(itemPrice).toFixed(2)}` : 'Accedi per prezzo',
                  priceNumeric: parseFloat(itemPrice || '0'),
                  image: item.item.image || '',
                  url: item.item.url || item.item['@id'] || '',
                  sku: item.item.sku || '',
                  brand: item.item.brand?.name || '',
                  inStock: true,
                  requiresLogin: !itemPrice,
                });
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Method 3: Fallback - direct product link extraction with strict filtering
    if (products.length === 0) {
      console.log('Trying direct link extraction...');
      
      // Look specifically for product links with images (real products always have images)
      const productWithImageRegex = /<a[^>]*href="(https:\/\/www\.utopya\.it\/[a-z0-9\-]+\.html)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*src="([^"]+)"[\s\S]*?<\/a>/gi;
      const matches = html.matchAll(productWithImageRegex);
      
      const seenUrls = new Set<string>();
      for (const match of matches) {
        const url = match[1];
        const name = match[2];
        const image = match[3];
        
        if (seenUrls.has(url)) continue;
        seenUrls.add(url);
        
        // Strict filtering - only product URLs
        if (url.includes('/category') || 
            url.includes('/customer') ||
            url.includes('/checkout') ||
            url.includes('/page') ||
            !name ||
            name.length < 5) continue;
        
        products.push({
          name: name.trim(),
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

    // Remove duplicates
    const uniqueProducts = Array.from(
      new Map(products.filter(p => p.url && p.name).map(p => [p.url, p])).values()
    );

    console.log(`Found ${uniqueProducts.length} products`);

    return new Response(
      JSON.stringify({ 
        products: uniqueProducts.slice(0, 30),
        searchUrl: utopyaUrl,
        totalFound: uniqueProducts.length,
        requiresLogin: !isAuthenticated,
        isAuthenticated,
        message: isAuthenticated 
          ? 'Prezzi aggiornati in tempo reale da Utopya.' 
          : 'I prezzi su Utopya richiedono login. Clicca sui prodotti per vedere i prezzi sul sito.'
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
