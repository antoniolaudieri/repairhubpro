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
    const { brand, model, storage } = await req.json();

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

    // Call Lovable AI to get price estimates
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
            content: `Sei un esperto valutatore di dispositivi usati per il mercato italiano. Devi fornire stime di prezzo realistiche per dispositivi usati basandoti sul mercato attuale (eBay, Subito.it, Amazon Renewed, Swappie, etc).

Fornisci SEMPRE i prezzi in EUR per le seguenti condizioni usando la scala standard italiana di grading:
- B (Condizione Discreta): Segni evidenti di usura, graffi visibili, funzionante ma estetica compromessa. Circa 50-60% del valore da nuovo.
- A (Buone Condizioni): Lievi segni di usura normali, piccoli graffi, batteria >80%. Circa 60-70% del valore.
- AA (Ottime Condizioni): Quasi perfetto, segni minimi visibili solo controluce, batteria >85%. Circa 70-80% del valore.
- AAA (Come Nuovo/Ricondizionato): Perfetto o ricondizionato certificato, nessun segno visibile, batteria >90% o sostituita. Circa 80-90% del valore.

Rispondi SOLO in formato JSON con questa struttura:
{
  "originalPrice": numero (prezzo originale di listino del nuovo),
  "grades": {
    "B": numero,
    "A": numero,
    "AA": numero,
    "AAA": numero
  },
  "trend": "alto" | "stabile" | "basso",
  "trendReason": "breve spiegazione del trend (max 15 parole)",
  "notes": "breve nota opzionale sul mercato attuale per questo dispositivo"
}

Il campo "trend" indica la tendenza del mercato per questo dispositivo:
- "alto": domanda superiore all'offerta, prezzi in crescita, device molto ricercato
- "stabile": domanda e offerta equilibrate, prezzi stabili
- "basso": offerta superiore alla domanda, prezzi in calo, device meno richiesto

Considera: anno di uscita, domanda di mercato, disponibilità ricambi, supporto software attuale.
Se non conosci il dispositivo esatto, fai stime ragionevoli basate su dispositivi simili della stessa fascia.`
          },
          {
            role: "user",
            content: `Valuta il prezzo usato per: ${brand} ${model}${storage ? ` ${storage}` : ''}`
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
          JSON.stringify({ error: "Crediti esauriti." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log("Price Estimate Response:", aiResponse);

    // Parse JSON from AI response - handle markdown code blocks
    let priceEstimate;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponse
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Try to extract just the first JSON object
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*?\}(?=\s*$|\s*\{)/);
      if (jsonMatch) {
        priceEstimate = JSON.parse(jsonMatch[0]);
      } else {
        // Try the whole cleaned response
        priceEstimate = JSON.parse(cleanedResponse);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw response:", aiResponse);
      return new Response(
        JSON.stringify({ error: "Impossibile elaborare la risposta AI" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ estimate: priceEstimate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in estimate-used-price function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
