import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate the most likely GSMArena image URL for a device
function generateGsmarenaUrl(brand: string, model: string): string {
  const brandLower = brand.toLowerCase().trim();
  const modelLower = model.toLowerCase().trim();
  const modelSlug = modelLower.replace(/\s+/g, '-').replace(/[()]/g, '');
  
  // Brand-specific URL patterns based on GSMArena naming conventions
  if (brandLower === 'apple' || brandLower.includes('iphone') || modelLower.includes('iphone')) {
    // iPhone: apple-iphone-15-pro-max
    let iphoneModel = modelLower.replace('iphone', '').trim().replace(/\s+/g, '-');
    if (!iphoneModel.startsWith('-')) iphoneModel = iphoneModel;
    return `https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-${iphoneModel}.jpg`;
  }
  
  if (brandLower === 'samsung') {
    // Samsung Galaxy: samsung-galaxy-s24-ultra
    if (modelLower.includes('galaxy')) {
      const galaxyModel = modelLower.replace('galaxy', '').trim().replace(/\s+/g, '-');
      return `https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-${galaxyModel}.jpg`;
    }
    return `https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'xiaomi') {
    return `https://fdn2.gsmarena.com/vv/bigpic/xiaomi-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'huawei') {
    return `https://fdn2.gsmarena.com/vv/bigpic/huawei-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'lg') {
    // LG G7 -> lg-g7-thinq
    return `https://fdn2.gsmarena.com/vv/bigpic/lg-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'sony') {
    return `https://fdn2.gsmarena.com/vv/bigpic/sony-xperia-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'oneplus') {
    return `https://fdn2.gsmarena.com/vv/bigpic/oneplus-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'google' || brandLower === 'pixel') {
    const pixelModel = modelLower.replace('pixel', '').trim().replace(/\s+/g, '-');
    return `https://fdn2.gsmarena.com/vv/bigpic/google-pixel-${pixelModel}.jpg`;
  }
  
  if (brandLower === 'motorola') {
    return `https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'oppo') {
    return `https://fdn2.gsmarena.com/vv/bigpic/oppo-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'realme') {
    return `https://fdn2.gsmarena.com/vv/bigpic/realme-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'vivo') {
    return `https://fdn2.gsmarena.com/vv/bigpic/vivo-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'poco') {
    return `https://fdn2.gsmarena.com/vv/bigpic/xiaomi-poco-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'nothing') {
    return `https://fdn2.gsmarena.com/vv/bigpic/nothing-phone-${modelSlug}.jpg`;
  }
  
  if (brandLower === 'honor') {
    return `https://fdn2.gsmarena.com/vv/bigpic/honor-${modelSlug}.jpg`;
  }
  
  // Default pattern
  return `https://fdn2.gsmarena.com/vv/bigpic/${brandLower}-${modelSlug}.jpg`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, model } = await req.json();

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: "Brand and model are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Generate base image URL from brand/model
    const baseImageUrl = generateGsmarenaUrl(brand, model);

    // Call Lovable AI to get device information
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sei un esperto di dispositivi elettronici. Dato marca e modello, fornisci informazioni dettagliate. Rispondi SOLO in formato JSON con i campi: 
- fullName (nome commerciale completo)
- year (anno di uscita, es: "2023")
- specs (oggetto con ram, storage, display, processor, camera se applicabile)
- gsmarenaSlug (slug esatto usato su GSMArena per questo dispositivo, es: "apple-iphone-15-pro-max", "samsung-galaxy-s24-ultra", "lg-g7-thinq")

IMPORTANTE: Per il gsmarenaSlug, usa il formato esatto di GSMArena che è: marca-modello-completo in lowercase con trattini. Ad esempio:
- iPhone 15 Pro Max -> apple-iphone-15-pro-max
- Galaxy Z Fold 3 -> samsung-galaxy-z-fold3-5g
- LG G7 -> lg-g7-thinq
- Pixel 8 Pro -> google-pixel-8-pro
- Samsung Galaxy A15 -> samsung-galaxy-a15
- iPhone 14 -> apple-iphone-14

Se non trovi info, usa valori ragionevoli basati su conoscenza generale.`
          },
          {
            role: "user",
            content: `Fornisci informazioni dettagliate per: ${brand} ${model}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit superato. Riprova tra poco." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti esauriti. Aggiungi crediti al tuo workspace Lovable." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log("AI Lookup Response:", aiResponse);

    // Try to parse JSON from AI response
    let deviceInfo;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        deviceInfo = JSON.parse(jsonMatch[0]);
      } else {
        deviceInfo = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback with basic info
      deviceInfo = {
        fullName: `${brand} ${model}`,
        year: "N/A",
        specs: {
          ram: "N/A",
          storage: "N/A",
          display: "N/A"
        },
        gsmarenaSlug: ""
      };
    }

    // Use AI-provided slug if available, otherwise use our generated URL
    let imageUrl = "";
    if (deviceInfo.gsmarenaSlug) {
      imageUrl = `https://fdn2.gsmarena.com/vv/bigpic/${deviceInfo.gsmarenaSlug}.jpg`;
    } else {
      imageUrl = baseImageUrl;
    }

    // Set the imageUrl in the response
    deviceInfo.imageUrl = imageUrl;
    
    console.log("Device info with image:", { brand, model, imageUrl, gsmarenaSlug: deviceInfo.gsmarenaSlug });

    return new Response(
      JSON.stringify({ device_info: deviceInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lookup-device function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
