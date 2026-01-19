const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping product URL:', formattedUrl);

    // Use extract format for structured product data
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The main product title shown prominently on the page' },
              description: { type: 'string', description: 'Product description or key features' },
              price: { type: 'number', description: 'The current selling price as a decimal number. For Amazon, look for the price with id "priceblock_ourprice" or "corePrice_feature_div" or the main displayed price. Do NOT use shipping costs or other prices.' },
              currency: { type: 'string', description: 'Currency symbol (€, $, £) or code (EUR, USD)' },
              imageUrl: { type: 'string', description: 'The main high-resolution product image URL. For Amazon, look for images from "m.media-amazon.com/images/I/" with large size (ending in ._AC_SL1500_.jpg or similar). Prefer the largest available image.' },
              brand: { type: 'string', description: 'Product brand or manufacturer name' },
              sku: { type: 'string', description: 'Product identifier: ASIN for Amazon, SKU, or product code' },
            },
            required: ['title'],
          },
          prompt: 'Extract product information from this e-commerce page. IMPORTANT: For the PRICE, find the main selling price (not shipping, not "was" price, not monthly payment). For Amazon Italy, look for the price displayed prominently near the buy button. For the IMAGE, find the main product photo URL - for Amazon images, convert thumbnail URLs to high-res by replacing size suffixes like "._AC_US40_" with "._AC_SL1500_" or finding the largest image variant.',
        },
        onlyMainContent: true,
        waitFor: 2000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract product data from response
    const extractData = data.data?.extract || data.extract || {};
    const metadata = data.data?.metadata || data.metadata || {};

    const product = {
      title: extractData.title || metadata.title || 'Prodotto senza nome',
      description: extractData.description || metadata.description || '',
      price: typeof extractData.price === 'number' ? extractData.price : parsePrice(extractData.price),
      currency: extractData.currency || '€',
      imageUrl: extractData.imageUrl || metadata.ogImage || '',
      brand: extractData.brand || '',
      sku: extractData.sku || '',
      sourceUrl: formattedUrl,
    };

    console.log('Product extracted:', product);

    return new Response(
      JSON.stringify({ success: true, product }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape product';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to parse price string to number
function parsePrice(priceStr: string | number | null | undefined): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return 0;
  
  // Remove currency symbols and spaces, replace comma with dot
  const cleaned = String(priceStr)
    .replace(/[€$£¥₹]/g, '')
    .replace(/\s/g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
