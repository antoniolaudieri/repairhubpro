import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'identity',
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

async function loginToUtopya(): Promise<{ cookies: string; isAuthenticated: boolean }> {
  const username = Deno.env.get('UTOPYA_USERNAME');
  const password = Deno.env.get('UTOPYA_PASSWORD');
  
  if (!username || !password) {
    console.log('Utopya credentials not configured');
    return { cookies: '', isAuthenticated: false };
  }
  
  try {
    const loginPageResponse = await fetch('https://www.utopya.it/customer/account/login/', {
      headers: browserHeaders,
    });
    
    if (!loginPageResponse.ok) {
      return { cookies: '', isAuthenticated: false };
    }
    
    const loginPageHtml = await loginPageResponse.text();
    const formKeyMatch = loginPageHtml.match(/name="form_key"\s+value="([^"]+)"/i);
    
    if (!formKeyMatch) {
      return { cookies: '', isAuthenticated: false };
    }
    
    const formKey = formKeyMatch[1];
    const initialCookies = loginPageResponse.headers.get('set-cookie') || '';
    
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

    const { cookies, isAuthenticated } = await loginToUtopya();

    const encodedQuery = encodeURIComponent(searchQuery).replace(/%20/g, '+');
    const utopyaUrl = `https://www.utopya.it/catalogsearch/result/?q=${encodedQuery}`;
    
    console.log('Fetching:', utopyaUrl, 'Authenticated:', isAuthenticated);

    const searchHeaders: Record<string, string> = { ...browserHeaders };
    if (cookies) searchHeaders['Cookie'] = cookies;
    
    const response = await fetch(utopyaUrl, { headers: searchHeaders });

    if (!response.ok) {
      throw new Error(`Failed to fetch Utopya: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const products: UtopyaProduct[] = [];
    const seenUrls = new Set<string>();

    // Extract all product URLs that end with .html (excluding system pages)
    const excludePatterns = [
      '/customer/', '/checkout/', '/wishlist/', '/catalogsearch/',
      '/privacy', '/terms', '/cookie', '/contact', '/about',
      '/category/', '/cms/', '/account/'
    ];

    // Find all .html links that look like products
    const urlRegex = /href="(https:\/\/www\.utopya\.it\/([a-z0-9\-]+)\.html)"/gi;
    let urlMatch;
    
    while ((urlMatch = urlRegex.exec(html)) !== null) {
      const url = urlMatch[1];
      const slug = urlMatch[2];
      
      // Skip excluded patterns and duplicates
      if (seenUrls.has(url)) continue;
      if (excludePatterns.some(p => url.includes(p))) continue;
      if (slug.length < 5) continue; // Skip very short slugs
      
      seenUrls.add(url);
    }

    console.log('Found', seenUrls.size, 'potential product URLs');

    // Now for each URL, try to find associated name, image, and price
    for (const url of seenUrls) {
      const urlEscaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Look for context around this URL (product card)
      // Search for name in alt, title, or link text
      let name = '';
      let image = '';
      let price = '';
      let priceNumeric = 0;
      let sku = '';
      let brand = '';

      // Try to find product name from alt attribute near the URL
      const altRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?<img[^>]*alt="([^"]+)"`, 'i');
      const altMatch = html.match(altRegex);
      if (altMatch) {
        name = altMatch[1].trim();
      }

      // Try to find name from title attribute
      if (!name) {
        const titleRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*title="([^"]+)"`, 'i');
        const titleMatch = html.match(titleRegex);
        if (titleMatch) {
          name = titleMatch[1].trim();
        }
      }

      // Try to find product image
      const imgRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?<img[^>]*src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"`, 'i');
      const imgMatch = html.match(imgRegex);
      if (imgMatch) {
        image = imgMatch[1];
      }

      // Alternative: image before the link
      if (!image) {
        const imgBeforeRegex = new RegExp(`<img[^>]*src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"[^>]*>[\\s\\S]{0,500}?href="${urlEscaped}"`, 'i');
        const imgBeforeMatch = html.match(imgBeforeRegex);
        if (imgBeforeMatch) {
          image = imgBeforeMatch[1];
        }
      }

      // Try to find price near the URL
      const priceRegex = new RegExp(`href="${urlEscaped}"[\\s\\S]{0,1000}?(?:data-price-amount="|€\\s*)([0-9]+[.,][0-9]{2})`, 'i');
      const priceMatch = html.match(priceRegex);
      if (priceMatch) {
        priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
        if (priceNumeric > 0) {
          price = `€${priceNumeric.toFixed(2)}`;
        }
      }

      // Try to find SKU
      const skuRegex = new RegExp(`href="${urlEscaped}"[\\s\\S]{0,500}?data-sku="([^"]+)"`, 'i');
      const skuMatch = html.match(skuRegex);
      if (skuMatch) {
        sku = skuMatch[1];
      }

      // If no name found, derive from URL slug
      if (!name) {
        const slug = url.replace('https://www.utopya.it/', '').replace('.html', '');
        name = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }

      // Only add if we have at least a name
      if (name && name.length > 5) {
        products.push({
          name,
          price: price || 'Accedi per prezzo',
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

    console.log('Extracted', products.length, 'products with details');

    return new Response(
      JSON.stringify({ 
        products: products.slice(0, 30),
        searchUrl: utopyaUrl,
        totalFound: products.length,
        requiresLogin: !isAuthenticated,
        isAuthenticated,
        message: isAuthenticated 
          ? 'Prezzi aggiornati in tempo reale.' 
          : 'I prezzi richiedono login su Utopya.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
