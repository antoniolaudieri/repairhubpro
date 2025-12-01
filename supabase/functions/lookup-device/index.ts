import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            content: "Sei un esperto di dispositivi elettronici. Dato marca e modello, fornisci informazioni dettagliate. Rispondi SOLO in formato JSON con i campi: fullName (nome commerciale completo), year (anno di uscita), specs (oggetto con ram, storage, display, processor, camera se applicabile), imageUrl (URL dell'immagine da GSMArena costruito come: https://fdn2.gsmarena.com/vv/bigpic/[slug].jpg dove [slug] è il nome del dispositivo in lowercase con trattini, es: apple-iphone-14-pro-max). Se non trovi info, usa valori ragionevoli basati su conoscenza generale."
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
        imageUrl: ""
      };
    }

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
