import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
};

interface UtopyaProduct {
  name: string;
  price: string | null;
  priceNumeric: number;
  image: string;
  url: string;
  sku: string;
  brand: string;
  inStock: boolean;
  requiresLogin: boolean;
}

// Try GraphQL API
async function searchViaGraphQL(query: string, cookies: string): Promise<{ success: boolean; products: UtopyaProduct[]; error?: string }> {
  console.log('=== Trying GraphQL API ===');
  
  try {
    const graphqlQuery = {
      query: `
        query productSearch($search: String!) {
          products(search: $search, pageSize: 30) {
            items {
              name
              sku
              url_key
              url_suffix
              small_image {
                url
              }
              price_range {
                minimum_price {
                  regular_price {
                    value
                    currency
                  }
                  final_price {
                    value
                    currency
                  }
                }
              }
            }
            total_count
          }
        }
      `,
      variables: { search: query }
    };

    const response = await fetch('https://www.utopya.it/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...browserHeaders
      },
      body: JSON.stringify(graphqlQuery)
    });

    console.log('GraphQL status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('GraphQL error response:', text.substring(0, 500));
      return { success: false, products: [], error: `GraphQL returned ${response.status}` };
    }

    const data = await response.json();
    console.log('GraphQL response:', JSON.stringify(data).substring(0, 800));

    if (data.errors) {
      console.log('GraphQL errors:', JSON.stringify(data.errors));
      return { success: false, products: [], error: data.errors[0]?.message || 'GraphQL error' };
    }

    if (!data.data?.products?.items) {
      return { success: false, products: [], error: 'No products in GraphQL response' };
    }

    const products: UtopyaProduct[] = data.data.products.items.map((item: any) => {
      const priceValue = item.price_range?.minimum_price?.final_price?.value;
      return {
        name: item.name || '',
        price: priceValue ? `€${priceValue.toFixed(2)}` : null,
        priceNumeric: priceValue || 0,
        image: item.small_image?.url || '',
        url: `https://www.utopya.it/${item.url_key}${item.url_suffix || '.html'}`,
        sku: item.sku || '',
        brand: '',
        inStock: true,
        requiresLogin: !priceValue
      };
    });

    console.log(`GraphQL found ${products.length} products`);
    return { success: true, products };
  } catch (error) {
    console.error('GraphQL error:', error);
    return { success: false, products: [], error: String(error) };
  }
}

// Get REST API token
async function getRestToken(username: string, password: string): Promise<string | null> {
  console.log('=== Getting REST API token ===');
  
  try {
    const response = await fetch('https://www.utopya.it/rest/V1/integration/customer/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...browserHeaders
      },
      body: JSON.stringify({ username, password })
    });

    console.log('Token response status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('Token error:', text.substring(0, 300));
      return null;
    }

    const token = await response.json();
    console.log('Got REST token:', !!token);
    return token;
  } catch (error) {
    console.error('Token error:', error);
    return null;
  }
}

// Search via REST API
async function searchViaREST(query: string, token: string): Promise<{ success: boolean; products: UtopyaProduct[]; error?: string }> {
  console.log('=== Trying REST API ===');
  
  try {
    const searchUrl = `https://www.utopya.it/rest/V1/products?searchCriteria[filterGroups][0][filters][0][field]=name&searchCriteria[filterGroups][0][filters][0][value]=%25${encodeURIComponent(query)}%25&searchCriteria[filterGroups][0][filters][0][conditionType]=like&searchCriteria[pageSize]=30`;
    
    console.log('REST URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...browserHeaders
      }
    });

    console.log('REST API status:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      console.log('REST error:', text.substring(0, 300));
      return { success: false, products: [], error: `REST API returned ${response.status}` };
    }

    const data = await response.json();
    console.log('REST API response:', JSON.stringify(data).substring(0, 800));

    if (!data.items || !Array.isArray(data.items)) {
      return { success: false, products: [], error: 'No items in REST response' };
    }

    const products: UtopyaProduct[] = data.items.map((item: any) => {
      const imageAttr = item.custom_attributes?.find((a: any) => a.attribute_code === 'image');
      
      return {
        name: item.name || '',
        price: item.price ? `€${item.price.toFixed(2)}` : null,
        priceNumeric: item.price || 0,
        image: imageAttr?.value ? `https://www.utopya.it/media/catalog/product${imageAttr.value}` : '',
        url: `https://www.utopya.it/${(item.sku || '').toLowerCase().replace(/\s+/g, '-')}.html`,
        sku: item.sku || '',
        brand: '',
        inStock: item.status === 1,
        requiresLogin: !item.price
      };
    });

    console.log(`REST API found ${products.length} products`);
    return { success: true, products };
  } catch (error) {
    console.error('REST API error:', error);
    return { success: false, products: [], error: String(error) };
  }
}

// Login to get cookies
async function loginToUtopya(): Promise<{ cookies: string; success: boolean }> {
  const username = Deno.env.get('UTOPYA_USERNAME');
  const password = Deno.env.get('UTOPYA_PASSWORD');
  
  console.log('=== Login attempt ===');
  console.log('Has credentials:', { username: !!username, password: !!password });
  
  if (!username || !password) {
    return { cookies: '', success: false };
  }

  try {
    const loginPageResponse = await fetch('https://www.utopya.it/customer/account/login/', {
      headers: browserHeaders
    });
    
    const loginPageHtml = await loginPageResponse.text();
    const formKeyMatch = loginPageHtml.match(/name="form_key"\s+value="([^"]+)"/);
    const formKey = formKeyMatch ? formKeyMatch[1] : '';
    
    const initialCookies = loginPageResponse.headers.get('set-cookie') || '';
    console.log('Form key found:', !!formKey);

    const loginResponse = await fetch('https://www.utopya.it/customer/account/loginPost/', {
      method: 'POST',
      headers: {
        ...browserHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initialCookies.split(',').map(c => c.split(';')[0]).join('; '),
        'Referer': 'https://www.utopya.it/customer/account/login/'
      },
      body: new URLSearchParams({
        'form_key': formKey,
        'login[username]': username,
        'login[password]': password,
        'send': ''
      }),
      redirect: 'manual'
    });

    const loginCookies = loginResponse.headers.get('set-cookie') || '';
    const allCookies = [initialCookies, loginCookies]
      .filter(Boolean)
      .join(', ')
      .split(',')
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    
    const success = loginResponse.status === 302 || loginResponse.status === 301;
    console.log('Login result:', { status: loginResponse.status, success });
    
    return { cookies: allCookies, success };
  } catch (error) {
    console.error('Login error:', error);
    return { cookies: '', success: false };
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
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Fallback: HTML scraping with improved parsing
async function searchViaHTML(query: string, cookies: string): Promise<{ success: boolean; products: UtopyaProduct[]; error?: string }> {
  console.log('=== Trying HTML scraping ===');
  
  try {
    const searchUrl = `https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(query)}`;
    console.log('HTML URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        ...browserHeaders,
        'Cookie': cookies
      }
    });

    if (!response.ok) {
      return { success: false, products: [], error: `HTML fetch returned ${response.status}` };
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    
    // Log sample of product list area
    const productListMatch = html.match(/<ol[^>]*class="[^"]*products[^"]*"[^>]*>([\s\S]*?)<\/ol>/i);
    if (productListMatch) {
      console.log('Product list found, length:', productListMatch[1].length);
    } else {
      console.log('No product list found');
      // Log a sample to understand structure
      const bodyStart = html.indexOf('<body');
      if (bodyStart > -1) {
        console.log('Body sample:', html.substring(bodyStart, bodyStart + 2000));
      }
    }

    // Try to find JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        console.log('JSON-LD type:', data['@type']);
        
        if (data['@type'] === 'ItemList' && data.itemListElement) {
          const products: UtopyaProduct[] = data.itemListElement.map((item: any) => ({
            name: item.name || item.item?.name || '',
            price: item.offers?.price ? `€${item.offers.price}` : null,
            priceNumeric: item.offers?.price || 0,
            image: item.image || item.item?.image || '',
            url: item.url || item.item?.url || '',
            sku: '',
            brand: item.brand?.name || '',
            inStock: true,
            requiresLogin: !item.offers?.price
          })).filter((p: UtopyaProduct) => p.name && p.url);
          
          if (products.length > 0) {
            console.log(`JSON-LD found ${products.length} products`);
            return { success: true, products };
          }
        }
      } catch (e) {
        // Continue
      }
    }

    const products: UtopyaProduct[] = [];
    
    // Method 1: Look for Magento widget data in script tags
    const magentoInitMatches = html.matchAll(/<script type="text\/x-magento-init">([\s\S]*?)<\/script>/gi);
    for (const match of magentoInitMatches) {
      try {
        const jsonStr = match[1].trim();
        if (jsonStr.includes('product') || jsonStr.includes('item')) {
          console.log('Magento init data sample:', jsonStr.substring(0, 500));
        }
      } catch (e) {}
    }

    // Method 2: Look for product data in window variables
    const windowDataMatch = html.match(/window\.products\s*=\s*(\[[\s\S]*?\]);/i) ||
                           html.match(/var\s+products\s*=\s*(\[[\s\S]*?\]);/i) ||
                           html.match(/"items"\s*:\s*(\[[\s\S]*?\])/i);
    if (windowDataMatch) {
      try {
        const productsData = JSON.parse(windowDataMatch[1]);
        console.log('Found window products data:', productsData.length);
        for (const p of productsData) {
          if (p.name && (p.url || p.product_url)) {
            products.push({
              name: p.name,
              price: p.price ? `€${p.price}` : null,
              priceNumeric: parseFloat(p.price) || 0,
              image: p.image || p.thumbnail || '',
              url: p.url || p.product_url || '',
              sku: p.sku || '',
              brand: '',
              inStock: true,
              requiresLogin: !p.price
            });
          }
        }
      } catch (e) {}
    }

    // Method 3: Look for data-mage-init attributes with product info
    const dataMageMatches = html.matchAll(/data-mage-init='([^']+)'/gi);
    for (const match of dataMageMatches) {
      try {
        const data = JSON.parse(match[1]);
        if (data.configurable || data.Magento_Catalog) {
          console.log('Found mage-init product data');
        }
      } catch (e) {}
    }

    // Method 4: Parse product items - look for li.product-item
    const productItemRegex = /<li[^>]*class="[^"]*product-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let itemMatch;
    
    while ((itemMatch = productItemRegex.exec(html)) !== null) {
      const itemHtml = itemMatch[1];
      
      // Extract URL
      const urlMatch = itemHtml.match(/<a[^>]*href="(https:\/\/www\.utopya\.it\/[^"]+\.html)"[^>]*>/i);
      if (!urlMatch) continue;
      
      const url = urlMatch[1];
      
      // Skip category URLs
      const slug = url.replace('https://www.utopya.it/', '').replace('.html', '');
      if (!slug.includes('-') && slug.length < 15) continue;
      
      // Extract name
      let name = '';
      const namePatterns = [
        /<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*title="([^"]+)"/i,
        /<a[^>]*title="([^"]+)"[^>]*class="[^"]*product-item-link[^"]*"/i,
        /<a[^>]*class="[^"]*product-item-link[^"]*"[^>]*>([^<]+)<\/a>/i,
        /title="([^"]{10,})"/i
      ];
      
      for (const pattern of namePatterns) {
        const match = itemHtml.match(pattern);
        if (match && match[1]) {
          const cleaned = decodeHtmlEntities(match[1].trim());
          if (cleaned.length > 5 && !cleaned.toLowerCase().includes('loading')) {
            name = cleaned;
            break;
          }
        }
      }
      
      // Fallback to slug
      if (!name) {
        name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      // Extract price
      let price: string | null = null;
      let priceNumeric = 0;
      const priceMatch = itemHtml.match(/data-price-amount="([0-9.]+)"/) || 
                         itemHtml.match(/€\s*([\d,]+(?:\.\d{2})?)/);
      if (priceMatch) {
        priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
        if (priceNumeric > 0) {
          price = `€${priceNumeric.toFixed(2)}`;
        }
      }
      
      // Extract image
      let image = '';
      const imgMatch = itemHtml.match(/<img[^>]*src="(https:\/\/www\.utopya\.it\/media\/catalog\/product[^"]+)"[^>]*>/i) ||
                       itemHtml.match(/<img[^>]*data-src="(https:\/\/www\.utopya\.it\/media\/catalog\/product[^"]+)"[^>]*>/i);
      if (imgMatch) {
        image = imgMatch[1];
      }
      
      // Extract SKU
      let sku = '';
      const skuMatch = itemHtml.match(/data-product-sku="([^"]+)"/i);
      if (skuMatch) {
        sku = skuMatch[1];
      }
      
      products.push({
        name,
        price,
        priceNumeric,
        image,
        url,
        sku,
        brand: '',
        inStock: !itemHtml.includes('out-of-stock'),
        requiresLogin: !price
      });
    }

    console.log(`HTML scraping found ${products.length} products`);
    
    // Method 5: Fallback - search for product blocks with more context
    if (products.length === 0) {
      console.log('Trying enhanced fallback extraction...');
      
      // Look for product links with surrounding context (within ~2000 chars)
      const productBlockRegex = /<(?:div|li|article)[^>]*class="[^"]*(?:product|item)[^"]*"[^>]*>([\s\S]{100,3000}?)<\/(?:div|li|article)>/gi;
      let blockMatch;
      
      while ((blockMatch = productBlockRegex.exec(html)) !== null && products.length < 20) {
        const block = blockMatch[1];
        
        // Extract URL
        const urlMatch = block.match(/href="(https:\/\/www\.utopya\.it\/[a-z0-9][a-z0-9\-]+\.html)"/i);
        if (!urlMatch) continue;
        
        const url = urlMatch[1];
        if (products.some(p => p.url === url)) continue;
        
        // Extract name from title or link text
        let name = '';
        const titleMatch = block.match(/title="([^"]{5,})"/i) || 
                          block.match(/class="[^"]*product[^"]*name[^"]*"[^>]*>([^<]+)</i) ||
                          block.match(/<a[^>]*href="[^"]*\.html"[^>]*>([^<]{5,})</i);
        if (titleMatch) {
          name = decodeHtmlEntities(titleMatch[1].trim());
        }
        
        // Extract image
        let image = '';
        const imgMatch = block.match(/src="(https:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i) ||
                        block.match(/data-src="(https:\/\/[^"]*(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"/i) ||
                        block.match(/srcset="([^\s"]+)/i);
        if (imgMatch) {
          image = imgMatch[1].split(' ')[0]; // Get first URL from srcset if present
        }
        
        // Extract price
        let price: string | null = null;
        let priceNumeric = 0;
        const priceMatch = block.match(/data-price-amount="([\d.]+)"/) ||
                          block.match(/€\s*([\d,]+(?:\.\d{2})?)/);
        if (priceMatch) {
          priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
          if (priceNumeric > 0) {
            price = `€${priceNumeric.toFixed(2)}`;
          }
        }
        
        if (name && name.length > 5) {
          products.push({
            name,
            price,
            priceNumeric,
            image,
            url,
            sku: '',
            brand: '',
            inStock: !block.includes('out-of-stock'),
            requiresLogin: !price
          });
        }
      }
      
      console.log(`Enhanced fallback found ${products.length} products`);
      
      // If still no products, try simple URL extraction as last resort
      if (products.length === 0) {
        console.log('Trying simple URL extraction...');
        const urlRegex = /href="(https:\/\/www\.utopya\.it\/([a-z0-9]+-[a-z0-9\-]+)\.html)"/gi;
        const seenUrls = new Set<string>();
        let urlMatch;
        
        const excludePatterns = ['/customer/', '/checkout/', '/wishlist/', '/catalogsearch/', '/privacy', '/terms'];
        
        while ((urlMatch = urlRegex.exec(html)) !== null && products.length < 20) {
          const url = urlMatch[1];
          const slug = urlMatch[2];
          
          if (seenUrls.has(url)) continue;
          if (excludePatterns.some(p => url.includes(p))) continue;
          if (slug.length < 10) continue;
          
          seenUrls.add(url);
          
          // Try to find image and price near this URL
          const urlPos = html.indexOf(url);
          const context = html.substring(Math.max(0, urlPos - 1500), Math.min(html.length, urlPos + 1500));
          
          let image = '';
          const imgMatch = context.match(/src="(https:\/\/www\.utopya\.(?:it|fr)\/media\/catalog\/product[^"]+)"/i);
          if (imgMatch) image = imgMatch[1];
          
          let price: string | null = null;
          let priceNumeric = 0;
          const priceMatch = context.match(/data-price-amount="([\d.]+)"/) ||
                            context.match(/"price":\s*([\d.]+)/) ||
                            context.match(/€\s*([\d,]+(?:\.\d{2})?)/);
          if (priceMatch) {
            priceNumeric = parseFloat(priceMatch[1].replace(',', '.'));
            if (priceNumeric > 0) {
              price = `€${priceNumeric.toFixed(2)}`;
            }
          }
          
          const titleMatch = context.match(new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*title="([^"]+)"`, 'i'));
          const name = titleMatch ? decodeHtmlEntities(titleMatch[1]) : slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          if (name.length > 5) {
            products.push({
              name,
              price,
              priceNumeric,
              image,
              url,
              sku: '',
              brand: '',
              inStock: true,
              requiresLogin: !price
            });
          }
        }
        
        console.log(`Simple URL fallback found ${products.length} products`);
      }
    }
    
    if (products.length > 0) {
      console.log('First product:', JSON.stringify(products[0]));
    }
    
    return { success: products.length > 0, products, error: products.length === 0 ? 'No products found in HTML' : undefined };
  } catch (error) {
    console.error('HTML scraping error:', error);
    return { success: false, products: [], error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();
    console.log('========== UTOPYA SEARCH START ==========');
    console.log('Query:', searchQuery);

    if (!searchQuery || searchQuery.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query di ricerca troppo corta', products: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Login to get cookies
    const { cookies, success: loginSuccess } = await loginToUtopya();

    let products: UtopyaProduct[] = [];
    let method = 'none';

    // Step 2: Try GraphQL API first
    const graphqlResult = await searchViaGraphQL(searchQuery, cookies);
    if (graphqlResult.success && graphqlResult.products.length > 0) {
      products = graphqlResult.products;
      method = 'GraphQL';
    } else {
      console.log('GraphQL failed, trying REST...');
      
      // Step 3: Try REST API
      const username = Deno.env.get('UTOPYA_USERNAME') || '';
      const password = Deno.env.get('UTOPYA_PASSWORD') || '';
      const token = await getRestToken(username, password);
      
      if (token) {
        const restResult = await searchViaREST(searchQuery, token);
        if (restResult.success && restResult.products.length > 0) {
          products = restResult.products;
          method = 'REST';
        }
      }
      
      // Step 4: Fallback to HTML scraping
      if (products.length === 0) {
        console.log('REST failed, trying HTML...');
        const htmlResult = await searchViaHTML(searchQuery, cookies);
        if (htmlResult.success) {
          products = htmlResult.products;
          method = 'HTML';
        }
      }
    }

    console.log(`========== SEARCH END ==========`);
    console.log(`Method: ${method}, Products: ${products.length}, Auth: ${loginSuccess}`);

    return new Response(
      JSON.stringify({
        products: products.slice(0, 30),
        searchUrl: `https://www.utopya.it/catalogsearch/result/?q=${encodeURIComponent(searchQuery)}`,
        totalFound: products.length,
        isAuthenticated: loginSuccess,
        method,
        message: loginSuccess 
          ? `${products.length} prodotti trovati via ${method}`
          : 'I prezzi richiedono login su Utopya.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Main error:', error);
    return new Response(
      JSON.stringify({ error: String(error), products: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
