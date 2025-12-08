import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Test if an image URL is actually accessible
async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    return response.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}

// Generate multiple possible image URLs for a device
function generateImageUrls(brand: string, model: string): string[] {
  const brandLower = brand.toLowerCase().trim();
  const modelLower = model.toLowerCase().trim();
  const fullName = `${brandLower}-${modelLower}`.replace(/\s+/g, '-').replace(/[()]/g, '');
  const modelSlug = modelLower.replace(/\s+/g, '-').replace(/[()]/g, '');
  
  const urls: string[] = [];
  
  // GSMArena patterns (most reliable for phones)
  urls.push(`https://fdn2.gsmarena.com/vv/bigpic/${fullName}.jpg`);
  urls.push(`https://fdn2.gsmarena.com/vv/bigpic/${brandLower}-${modelSlug}.jpg`);
  
  // PhoneArena patterns
  urls.push(`https://i-cdn.phonearena.com/images/phones/${encodeURIComponent(brand)}-${encodeURIComponent(model)}.jpg`);
  
  // Device-specific patterns for common brands
  if (brandLower === 'apple' || brandLower === 'iphone') {
    const iphoneModel = modelLower.replace('iphone', '').trim().replace(/\s+/g, '-');
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-${iphoneModel}.jpg`);
    urls.push(`https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-${iphoneModel.replace(/-/g, '')}-select?wid=470&hei=556&fmt=png-alpha`);
  }
  
  if (brandLower === 'samsung') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-${modelSlug}.jpg`);
    urls.push(`https://images.samsung.com/is/image/samsung/${modelSlug}`);
  }
  
  if (brandLower === 'xiaomi') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/xiaomi-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'huawei') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/huawei-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'lg') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/lg-${modelSlug}.jpg`);
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/lg-${modelSlug}-new.jpg`);
  }
  
  if (brandLower === 'sony') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/sony-xperia-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'oneplus') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/oneplus-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'google' || brandLower === 'pixel') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/google-pixel-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'motorola') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/motorola-${modelSlug}.jpg`);
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/motorola-moto-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'oppo') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/oppo-${modelSlug}.jpg`);
  }
  
  if (brandLower === 'realme') {
    urls.push(`https://fdn2.gsmarena.com/vv/bigpic/realme-${modelSlug}.jpg`);
  }
  
  return urls;
}

// Find first working image URL
async function findWorkingImageUrl(brand: string, model: string): Promise<string> {
  const urls = generateImageUrls(brand, model);
  
  // Check URLs in parallel, but limit concurrency
  const results = await Promise.all(
    urls.slice(0, 6).map(async (url) => {
      const accessible = await isImageAccessible(url);
      return { url, accessible };
    })
  );
  
  const working = results.find(r => r.accessible);
  return working?.url || "";
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

    // Start image search in parallel with AI call
    const imagePromise = findWorkingImageUrl(brand, model);

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

    // Wait for image search result
    let imageUrl = await imagePromise;

    // If parallel search didn't find image, try with AI-provided slug
    if (!imageUrl && deviceInfo.gsmarenaSlug) {
      const slugUrl = `https://fdn2.gsmarena.com/vv/bigpic/${deviceInfo.gsmarenaSlug}.jpg`;
      if (await isImageAccessible(slugUrl)) {
        imageUrl = slugUrl;
      }
    }

    // Set the imageUrl in the response
    deviceInfo.imageUrl = imageUrl;

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
