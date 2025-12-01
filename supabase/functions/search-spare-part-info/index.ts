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
    const { partName, brand, model } = await req.json();
    
    console.log('Searching spare part info for:', { partName, brand, model });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const searchPrompt = `Search for spare part information: "${partName}" for ${brand || 'generic'} ${model || 'device'}.

Provide:
1. Estimated market price in EUR (retail price for repair shops)
2. Direct image URL from reliable sources (iFixit, Amazon, eBay, AliExpress)
3. Brief technical description

Format your response as JSON:
{
  "estimated_price": number,
  "image_url": "direct image URL",
  "description": "brief description"
}

If you cannot find exact information, provide reasonable estimates based on similar parts.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a spare parts pricing and sourcing expert. Always return valid JSON with estimated_price, image_url, and description fields.' 
          },
          { role: 'user', content: searchPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response:', content);

    // Parse JSON from AI response
    let result;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI JSON response:', e);
      // Fallback with default values
      result = {
        estimated_price: 0,
        image_url: '',
        description: 'Unable to fetch information. Please enter manually.'
      };
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in search-spare-part-info:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        estimated_price: 0,
        image_url: '',
        description: 'Error fetching information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
