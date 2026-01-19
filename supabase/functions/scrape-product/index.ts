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

    // Use JSON extraction for structured product data
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: [
          'markdown',
          {
            type: 'json',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Product title or name' },
                description: { type: 'string', description: 'Product description' },
                price: { type: 'number', description: 'Product price as a number (without currency symbol)' },
                currency: { type: 'string', description: 'Currency symbol or code (e.g., EUR, USD, €)' },
                imageUrl: { type: 'string', description: 'Main product image URL' },
                brand: { type: 'string', description: 'Product brand name' },
                sku: { type: 'string', description: 'Product SKU or ASIN' },
              },
              required: ['title'],
            },
            prompt: 'Extract the main product information from this e-commerce page. Get the title, description, price (as a number without currency), currency, main image URL, brand, and SKU/ASIN if available.',
          },
        ],
        onlyMainContent: true,
        waitFor: 2000, // Wait for dynamic content
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
    const jsonData = data.data?.json || data.json || {};
    const metadata = data.data?.metadata || data.metadata || {};

    const product = {
      title: jsonData.title || metadata.title || 'Prodotto senza nome',
      description: jsonData.description || metadata.description || '',
      price: typeof jsonData.price === 'number' ? jsonData.price : parsePrice(jsonData.price),
      currency: jsonData.currency || '€',
      imageUrl: jsonData.imageUrl || metadata.ogImage || '',
      brand: jsonData.brand || '',
      sku: jsonData.sku || '',
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
