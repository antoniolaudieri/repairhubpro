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

// Decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Clean product name - remove placeholders and invalid text
function cleanProductName(name: string): string {
  if (!name) return '';
  
  // First decode HTML entities
  let cleaned = decodeHtmlEntities(name).trim();
  
  const invalidNames = [
    'loading', 'caricamento', 'placeholder', '...', 
    'undefined', 'null', 'image', 'foto', 'photo'
  ];
  
  const lowerCleaned = cleaned.toLowerCase();
  
  // Check if name is invalid
  if (invalidNames.some(inv => lowerCleaned.includes(inv))) {
    return '';
  }
  
  // Must be at least 5 chars and contain some letters
  if (cleaned.length < 5 || !/[a-zA-Z]{3,}/.test(cleaned)) {
    return '';
  }
  
  return cleaned;
}

// Check if URL is a category page (not a product)
function isCategoryUrl(url: string): boolean {
  const slug = url.replace('https://www.utopya.it/', '').replace('.html', '');
  
  // Category pages are typically short slugs without hyphens
  const categoryPatterns = [
    'apple', 'samsung', 'xiaomi', 'motorola', 'altri', 'accessori',
    'protection', 'informatica', 'attrezzature', 'dispositivi', 'laptops',
    'brand', 'huawei', 'oppo', 'realme', 'oneplus', 'google', 'sony',
    'lg', 'nokia', 'honor', 'asus', 'lenovo', 'tablet', 'watch'
  ];
  
  // Check exact match with known categories
  if (categoryPatterns.includes(slug.toLowerCase())) {
    return true;
  }
  
  // Category URLs are usually single words without hyphens
  if (!slug.includes('-') && slug.length < 20) {
    return true;
  }
  
  return false;
}

// Convert URL slug to readable name
function slugToName(url: string): string {
  const slug = url
    .replace('https://www.utopya.it/', '')
    .replace('.html', '')
    .replace(/-+/g, ' ')
    .trim();
  
  // Capitalize first letter of each word
  return slug.replace(/\b\w/g, l => l.toUpperCase());
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
    
    console.log('Fetching:', utopyaUrl);

    const searchHeaders: Record<string, string> = { ...browserHeaders };
    if (cookies) searchHeaders['Cookie'] = cookies;
    
    const response = await fetch(utopyaUrl, { headers: searchHeaders });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    const products: UtopyaProduct[] = [];
    const seenUrls = new Set<string>();

    const excludePatterns = [
      '/customer/', '/checkout/', '/wishlist/', '/catalogsearch/',
      '/privacy', '/terms', '/cookie', '/contact', '/about',
      '/category/', '/cms/', '/account/', '/review/', '/compare/'
    ];

    // Find all product URLs
    const urlRegex = /href="(https:\/\/www\.utopya\.it\/([a-z0-9\-]+)\.html)"/gi;
    let urlMatch;
    
    while ((urlMatch = urlRegex.exec(html)) !== null) {
      const url = urlMatch[1];
      const slug = urlMatch[2];
      
      if (seenUrls.has(url)) continue;
      if (excludePatterns.some(p => url.includes(p))) continue;
      if (slug.length < 5) continue;
      // Filter out category pages - only keep actual product URLs
      if (isCategoryUrl(url)) continue;
      
      seenUrls.add(url);
    }

    console.log('Found URLs:', seenUrls.size);

    // Extract product details for each URL
    for (const url of seenUrls) {
      const urlEscaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      let name = '';
      let image = '';
      let price = '';
      let priceNumeric = 0;

      // Method 1: Look for title attribute on the link
      const titleRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*title="([^"]+)"`, 'i');
      const titleMatch = html.match(titleRegex);
      if (titleMatch) {
        name = cleanProductName(titleMatch[1]);
      }

      // Method 2: Look for alt attribute on img inside link
      if (!name) {
        const altRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?<img[^>]*alt="([^"]+)"`, 'i');
        const altMatch = html.match(altRegex);
        if (altMatch) {
          name = cleanProductName(altMatch[1]);
        }
      }

      // Method 3: Look for product-item-link class with text content
      if (!name) {
        const linkTextRegex = new RegExp(`<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*href="${urlEscaped}"[^>]*>([^<]+)</a>`, 'i');
        const linkTextMatch = html.match(linkTextRegex);
        if (linkTextMatch) {
          name = cleanProductName(linkTextMatch[1]);
        }
      }

      // Method 4: Reverse - look for link with href after class
      if (!name) {
        const reverseRegex = new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*class="[^"]*product-item-link[^"]*"[^>]*>([^<]+)</a>`, 'i');
        const reverseMatch = html.match(reverseRegex);
        if (reverseMatch) {
          name = cleanProductName(reverseMatch[1]);
        }
      }

      // Fallback: Use URL slug as name (always works)
      if (!name) {
        name = slugToName(url);
      }

      // Find image
      const imgPatterns = [
        new RegExp(`<a[^>]*href="${urlEscaped}"[^>]*>[\\s\\S]*?<img[^>]*src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"`, 'i'),
        new RegExp(`<img[^>]*src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"[^>]*>[\\s\\S]{0,300}?href="${urlEscaped}"`, 'i'),
        new RegExp(`<img[^>]*data-src="(https://www\\.utopya\\.it/media/catalog/product[^"]+)"[^>]*>[\\s\\S]{0,300}?href="${urlEscaped}"`, 'i'),
      ];

      for (const pattern of imgPatterns) {
        const imgMatch = html.match(pattern);
        if (imgMatch) {
          image = imgMatch[1];
          break;
        }
      }

      // Find price
      const pricePatterns = [
        new RegExp(`href="${urlEscaped}"[\\s\\S]{0,1500}?data-price-amount="([0-9.]+)"`, 'i'),
        new RegExp(`href="${urlEscaped}"[\\s\\S]{0,1500}?€\\s*([0-9]+[.,][0-9]{2})`, 'i'),
        new RegExp(`data-price-amount="([0-9.]+)"[\\s\\S]{0,500}?href="${urlEscaped}"`, 'i'),
      ];

      for (const pattern of pricePatterns) {
        const priceMatch = html.match(pattern);
        if (priceMatch) {
          priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
          if (priceNumeric > 0) {
            price = `€${priceNumeric.toFixed(2)}`;
            break;
          }
        }
      }

      if (name) {
        products.push({
          name,
          price: price || 'Accedi per prezzo',
          priceNumeric,
          image,
          url,
          sku: '',
          brand: '',
          inStock: true,
          requiresLogin: priceNumeric === 0,
        });
      }
    }

    console.log('Products extracted:', products.length);
    
    // Log first product for debugging
    if (products.length > 0) {
      console.log('First product:', JSON.stringify(products[0]));
    }

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
