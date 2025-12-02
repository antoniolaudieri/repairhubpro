import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Search DuckDuckGo for images
async function searchRepairImages(query: string): Promise<string[]> {
  try {
    const searchQuery = encodeURIComponent(`${query} repair guide tutorial`);
    const response = await fetch(
      `https://duckduckgo.com/?q=${searchQuery}&iar=images&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }
    );
    
    const html = await response.text();
    const imageUrls: string[] = [];
    
    // Extract image URLs from response
    const regex = /https:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi;
    const matches = html.match(regex);
    
    if (matches) {
      for (const url of matches) {
        if (!url.includes('duckduckgo') && imageUrls.length < 3) {
          imageUrls.push(url);
        }
      }
    }
    
    return imageUrls;
  } catch (error) {
    console.error("Image search error:", error);
    return [];
  }
}

// Get iFixit-style images for specific repair types
function getRepairTypeImages(deviceType: string, repairType: string): string {
  const imageMap: Record<string, string> = {
    // Screen repairs
    "screen": "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=400",
    "display": "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=400",
    "lcd": "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=400",
    // Battery
    "battery": "https://images.unsplash.com/photo-1619641805634-98e018a6ba43?w=400",
    "batteria": "https://images.unsplash.com/photo-1619641805634-98e018a6ba43?w=400",
    // Charging
    "charging": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    "connettore": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    "ricarica": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400",
    // Camera
    "camera": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
    "fotocamera": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400",
    // Speaker/Audio
    "speaker": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400",
    "audio": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400",
    "altoparlante": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=400",
    // Tools
    "tools": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
    "strumenti": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400",
    // General
    "default": "https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=400",
  };
  
  const lowerRepair = repairType.toLowerCase();
  for (const [key, url] of Object.entries(imageMap)) {
    if (lowerRepair.includes(key)) {
      return url;
    }
  }
  return imageMap.default;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { device_type, brand, model, issue, condition } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Sei un esperto tecnico di riparazione di dispositivi elettronici stile iFixit. Crea una guida di riparazione dettagliata step-by-step.

Dispositivo: ${device_type} - ${brand} ${model}
Problema riportato: ${issue}
${condition ? `Condizioni iniziali: ${condition}` : ""}

Rispondi SOLO con un JSON valido (senza markdown code blocks) nel seguente formato:
{
  "diagnosis": {
    "problem": "Descrizione del problema identificato",
    "cause": "Causa probabile",
    "severity": "low|medium|high",
    "repairability": 1-10
  },
  "overview": {
    "difficulty": "Facile|Medio|Difficile|Esperto",
    "estimatedTime": "30 min - 1 ora",
    "partsNeeded": ["Parte 1", "Parte 2"],
    "toolsNeeded": ["Strumento 1", "Strumento 2"]
  },
  "steps": [
    {
      "stepNumber": 1,
      "title": "Titolo dello step",
      "description": "Descrizione dettagliata di cosa fare",
      "imageSearchQuery": "query per cercare immagine pertinente",
      "warnings": ["Attenzione: avviso importante"],
      "tips": ["Suggerimento utile"],
      "checkpoints": ["Verifica che sia fatto correttamente"]
    }
  ],
  "troubleshooting": [
    {
      "problem": "Problema comune",
      "solution": "Soluzione"
    }
  ],
  "finalNotes": "Note finali e consigli post-riparazione"
}

Includi almeno 6-8 step dettagliati. Per ogni step, includi warnings se ci sono rischi, tips se ci sono trucchi utili, e checkpoints per verificare il lavoro.`;

    console.log("Generating repair guide for:", brand, model, issue);

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
            content: "Sei un tecnico esperto di riparazione elettronica con oltre 15 anni di esperienza. Crei guide dettagliate stile iFixit. Rispondi SEMPRE e SOLO con JSON valido, senza markdown code blocks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
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
    let aiContent = data.choices[0].message.content;
    
    // Clean up the response - remove markdown code blocks if present
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log("AI Response (cleaned):", aiContent.substring(0, 200));

    let guide;
    try {
      guide = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Return a fallback text-based response
      return new Response(
        JSON.stringify({ 
          suggestions: aiContent,
          isStructured: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrich steps with images
    if (guide.steps && Array.isArray(guide.steps)) {
      for (const step of guide.steps) {
        // Try to get a relevant image
        const searchQuery = step.imageSearchQuery || `${brand} ${model} ${step.title}`;
        const images = await searchRepairImages(searchQuery);
        
        if (images.length > 0) {
          step.imageUrl = images[0];
        } else {
          // Use fallback based on step content
          step.imageUrl = getRepairTypeImages(device_type, step.title + " " + step.description);
        }
      }
    }

    console.log("Repair guide generated successfully with", guide.steps?.length || 0, "steps");

    return new Response(
      JSON.stringify({ 
        guide,
        isStructured: true,
        suggestions: null // Keep for backward compatibility
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in repair-assistant function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
