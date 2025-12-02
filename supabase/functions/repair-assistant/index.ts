import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate an image using Lovable AI
async function generateStepImage(
  apiKey: string,
  deviceBrand: string,
  deviceModel: string,
  stepTitle: string,
  stepDescription: string
): Promise<string | null> {
  try {
    const prompt = `Technical repair illustration, professional iFixit style guide image showing: ${stepTitle} on a ${deviceBrand} ${deviceModel} smartphone. Clean white background, detailed hands-on repair view, high quality technical documentation style. Step: ${stepDescription.substring(0, 100)}. Ultra high resolution, photorealistic.`;

    console.log("Generating image for step:", stepTitle);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log("Image generated successfully for:", stepTitle);
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

// Get fallback images for common repair types
function getFallbackImage(stepTitle: string, deviceType: string): string {
  const lowerTitle = stepTitle.toLowerCase();
  
  // Tool/preparation images
  if (lowerTitle.includes("strument") || lowerTitle.includes("prepara") || lowerTitle.includes("tool")) {
    return "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop";
  }
  
  // Opening/disassembly
  if (lowerTitle.includes("apri") || lowerTitle.includes("rimuov") || lowerTitle.includes("smonta")) {
    return "https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=600&h=400&fit=crop";
  }
  
  // Screen/display
  if (lowerTitle.includes("schermo") || lowerTitle.includes("display") || lowerTitle.includes("lcd")) {
    return "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=600&h=400&fit=crop";
  }
  
  // Battery
  if (lowerTitle.includes("batteria") || lowerTitle.includes("battery")) {
    return "https://images.unsplash.com/photo-1619641805634-98e018a6ba43?w=600&h=400&fit=crop";
  }
  
  // Connector/charging
  if (lowerTitle.includes("connettore") || lowerTitle.includes("ricarica") || lowerTitle.includes("porta")) {
    return "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=400&fit=crop";
  }
  
  // Camera
  if (lowerTitle.includes("fotocamera") || lowerTitle.includes("camera")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop";
  }
  
  // Testing/verification
  if (lowerTitle.includes("test") || lowerTitle.includes("verifica") || lowerTitle.includes("controllo")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop";
  }
  
  // Assembly/closing
  if (lowerTitle.includes("assembla") || lowerTitle.includes("chiud") || lowerTitle.includes("rimonta")) {
    return "https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=600&h=400&fit=crop";
  }
  
  // Default electronics repair image
  return "https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=600&h=400&fit=crop";
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
      "title": "Titolo dello step (es: Preparazione strumenti, Rimozione schermo, etc)",
      "description": "Descrizione dettagliata di cosa fare in questo step specifico per ${brand} ${model}",
      "warnings": ["Attenzione: avviso importante se presente"],
      "tips": ["Suggerimento utile se presente"],
      "checkpoints": ["Verifica che sia fatto correttamente"]
    }
  ],
  "troubleshooting": [
    {
      "problem": "Problema comune durante la riparazione",
      "solution": "Soluzione"
    }
  ],
  "finalNotes": "Note finali e consigli post-riparazione per ${brand} ${model}"
}

IMPORTANTE: 
- Includi 6-8 step dettagliati specifici per ${brand} ${model}
- Ogni step deve essere specifico per questo dispositivo, non generico
- Per ogni step, includi warnings se ci sono rischi, tips se ci sono trucchi utili
- I checkpoints servono per verificare il lavoro fatto`;

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
            content: "Sei un tecnico esperto di riparazione elettronica con oltre 15 anni di esperienza. Crei guide dettagliate stile iFixit specifiche per ogni dispositivo. Rispondi SEMPRE e SOLO con JSON valido, senza markdown code blocks."
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
    
    console.log("AI Response received, parsing JSON...");

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

    // Generate images for each step (limit to first 4 steps to save API calls, use fallbacks for rest)
    if (guide.steps && Array.isArray(guide.steps)) {
      console.log(`Generating images for ${Math.min(guide.steps.length, 4)} steps...`);
      
      for (let i = 0; i < guide.steps.length; i++) {
        const step = guide.steps[i];
        
        // Generate AI images for first 4 important steps, use fallbacks for others
        if (i < 4) {
          const generatedImage = await generateStepImage(
            LOVABLE_API_KEY,
            brand,
            model,
            step.title,
            step.description
          );
          
          if (generatedImage) {
            step.imageUrl = generatedImage;
          } else {
            step.imageUrl = getFallbackImage(step.title, device_type);
          }
        } else {
          // Use contextual fallback for remaining steps
          step.imageUrl = getFallbackImage(step.title, device_type);
        }
      }
    }

    console.log("Repair guide generated successfully with", guide.steps?.length || 0, "steps");

    return new Response(
      JSON.stringify({ 
        guide,
        isStructured: true,
        suggestions: null
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
