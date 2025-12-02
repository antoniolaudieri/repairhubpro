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

    const searchPrompt = `Find a high-quality product image URL for this spare part: "${partName}" ${brand ? `for ${brand}` : ''} ${model ? model : ''}.

CRITICAL REQUIREMENTS:
1. Return ONLY a direct image URL (must end in .jpg, .jpeg, .png, .webp)
2. Prioritize sources: iFixit.com, Amazon product images, eBay, AliExpress
3. Image must be clear and show the actual spare part
4. Verify the URL is accessible and direct (not a webpage)

Format your response as JSON:
{
  "image_url": "direct image URL ending in .jpg/.png/.webp"
}

If no reliable image found, return:
{
  "image_url": ""
}`;

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
            content: 'You are an expert at finding product images for spare parts. Return valid JSON with ONLY the image_url field containing a direct image URL.' 
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
        image_url: ''
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
        image_url: ''
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
