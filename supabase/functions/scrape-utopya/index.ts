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

// Login to Utopya and get session cookies
async function loginToUtopya(): Promise<{ cookies: string; isAuthenticated: boolean }> {
  const username = Deno.env.get('UTOPYA_USERNAME');
  const password = Deno.env.get('UTOPYA_PASSWORD');
  
  if (!username || !password) {
    console.log('Utopya credentials not configured');
    return { cookies: '', isAuthenticated: false };
  }
  
  console.log('Attempting Utopya login with username:', username);
  
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
    console.log('Found form_key:', formKey.substring(0, 10) + '...');
    
    // Get cookies from login page response
    const initialCookies = loginPageResponse.headers.get('set-cookie') || '';
    console.log('Initial cookies received');
    
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
    
    // Check if login was successful by looking for redirect to account page
    const isAuthenticated = loginResponse.status === 302 || 
                           loginResponse.status === 301 ||
                           loginCookies.includes('customer');
    
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
    console.log('Session established, authenticated:', isAuthenticated);

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
      console.error(`Failed to fetch Utopya: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch Utopya: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const products: UtopyaProduct[] = [];

    // Method 1: Extract from JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const jsonLdMatch of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
          console.log('Found JSON-LD ItemList with', jsonData.itemListElement.length, 'items');
          for (const item of jsonData.itemListElement) {
            if (item.item && item.item.name) {
              const price = item.item.offers?.price;
              products.push({
                name: item.item.name,
                price: price ? `€${parseFloat(price).toFixed(2)}` : 'Accedi per prezzo',
                priceNumeric: parseFloat(price || '0'),
                image: item.item.image || '',
                url: item.item.url || item.item['@id'] || '',
                sku: item.item.sku || '',
                brand: item.item.brand?.name || '',
                inStock: item.item.offers?.availability?.includes('InStock') ?? true,
                requiresLogin: !price,
              });
            }
          }
        } else if (jsonData['@type'] === 'Product') {
          const price = jsonData.offers?.price;
          products.push({
            name: jsonData.name,
            price: price ? `€${parseFloat(price).toFixed(2)}` : 'Accedi per prezzo',
            priceNumeric: parseFloat(price || '0'),
            image: jsonData.image || '',
            url: jsonData.url || '',
            sku: jsonData.sku || '',
            brand: jsonData.brand?.name || '',
            inStock: jsonData.offers?.availability?.includes('InStock') ?? true,
            requiresLogin: !price,
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    // Method 2: Parse from HTML product items
    if (products.length === 0) {
      console.log('Trying HTML parsing method...');
      
      // Look for product URLs and names
      const productUrlRegex = /href="(https:\/\/www\.utopya\.it\/[a-z0-9\-]+\.html)"[^>]*>([^<]*)</gi;
      const urlMatches = html.matchAll(productUrlRegex);
      
      const seenUrls = new Set<string>();
      for (const match of urlMatches) {
        const url = match[1];
        let name = match[2].trim();
        
        // Skip non-product URLs and duplicates
        if (seenUrls.has(url) ||
            url.includes('/checkout') || 
            url.includes('/customer') || 
            url.includes('/catalogsearch') ||
            url.includes('/wishlist') ||
            url.includes('/privacy') ||
            url.includes('/terms') ||
            url.includes('/cookie')) {
          continue;
        }
        
        seenUrls.add(url);
        
        // If name is empty, try to extract from URL
        if (!name) {
          const slug = url.replace('https://www.utopya.it/', '').replace('.html', '');
          name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Try to find image for this product
        const urlEscaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const imgRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?<img[^>]*src="([^"]+)"`, 'i');
        const imgMatch = html.match(imgRegex);
        const image = imgMatch ? imgMatch[1] : '';
        
        // Try to find price
        let price = '';
        let priceNumeric = 0;
        const priceRegex = new RegExp(`href="${urlEscaped}"[\\s\\S]*?(?:€|EUR)\\s*([0-9]+[.,][0-9]{2})`, 'i');
        const priceMatch = html.match(priceRegex);
        if (priceMatch) {
          priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
          price = `€${priceNumeric.toFixed(2)}`;
        }
        
        if (name && name.length > 3) {
          products.push({
            name,
            price: price || 'Accedi per prezzo',
            priceNumeric,
            image,
            url,
            sku: '',
            brand: '',
            inStock: true,
            requiresLogin: !price,
          });
        }
      }
    }

    // Method 3: Look for product data in JavaScript variables
    if (products.length === 0) {
      const jsDataRegex = /(?:products|items)\s*[=:]\s*(\[[\s\S]*?\])\s*[;,]/gi;
      const jsMatches = html.matchAll(jsDataRegex);
      
      for (const jsMatch of jsMatches) {
        try {
          const jsProducts = JSON.parse(jsMatch[1]);
          if (Array.isArray(jsProducts)) {
            console.log('Found JS product data:', jsProducts.length);
            for (const p of jsProducts) {
              if (p.name || p.title) {
                products.push({
                  name: p.name || p.title || '',
                  price: p.price ? `€${parseFloat(p.price).toFixed(2)}` : 'Accedi per prezzo',
                  priceNumeric: parseFloat(p.price || '0'),
                  image: p.image || p.thumbnail || '',
                  url: p.url || p.product_url || '',
                  sku: p.sku || p.id || '',
                  brand: p.brand || '',
                  inStock: p.is_salable !== false,
                  requiresLogin: !p.price,
                });
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }

    // Remove duplicates based on URL
    const uniqueProducts = Array.from(
      new Map(products.filter(p => p.url).map(p => [p.url, p])).values()
    );

    console.log(`Found ${uniqueProducts.length} unique products`);

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
