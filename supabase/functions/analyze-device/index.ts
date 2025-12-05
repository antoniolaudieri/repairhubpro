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
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call Lovable AI with vision capabilities
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
            content: `Sei un esperto nell'identificazione e valutazione di dispositivi elettronici. Analizza l'immagine e fornisci:

1. IDENTIFICAZIONE DISPOSITIVO:
- type: tipo dispositivo (smartphone, tablet, pc, laptop, smartwatch, altro)
- brand: marca
- model: modello
- imei: se visibile
- serial: se visibile
- confidence: alta/media/bassa

2. VALUTAZIONE CONDIZIONI (per pre-compilare checklist riparazione):
Valuta ogni elemento con uno di questi stati: "ok", "damaged", "not_working", "not_applicable"

condition_assessment deve contenere:
- screen: stato schermo (crepe, graffi, dead pixels visibili)
- back_cover: stato cover posteriore
- frame: stato cornice/bordi
- buttons: stato tasti fisici visibili
- camera_lens: stato lente fotocamera
- charging_port: stato porta ricarica (se visibile)
- speakers: stato griglie altoparlanti
- overall_condition: condizione generale (ok, damaged, not_working)
- visible_damage_notes: descrizione breve dei danni visibili

Rispondi SOLO in formato JSON valido con campi: type, brand, model, imei, serial, confidence, condition_assessment.
Se non riesci a identificare qualcosa, usa "unknown". Per condizioni non valutabili dalla foto usa "not_applicable".`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identifica questo dispositivo e valuta le sue condizioni fisiche visibili nella foto."
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
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

    console.log("AI Response:", aiResponse);

    // Try to parse JSON from AI response
    let deviceInfo;
    try {
      // Extract JSON from response if it's embedded in text
      const jsonMatch = aiResponse.match(/\{[^}]+\}/);
      if (jsonMatch) {
        deviceInfo = JSON.parse(jsonMatch[0]);
      } else {
        deviceInfo = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: try to extract info from text
      deviceInfo = {
        type: "unknown",
        brand: "unknown",
        model: "unknown",
      };
    }

    return new Response(
      JSON.stringify({ device_info: deviceInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-device function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
