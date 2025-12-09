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

    // Build device query - if model looks like just a number, prepend common prefixes
    let deviceQuery = `${brand} ${model}`;
    if (/^\d+$/.test(model.trim())) {
      // If model is just a number, it's likely iPhone/iPad/etc
      const lowerBrand = brand.toLowerCase();
      if (lowerBrand.includes('apple') || lowerBrand === 'iphone' || lowerBrand === 'ipad') {
        deviceQuery = `Apple iPhone ${model}`;
      } else if (lowerBrand.includes('samsung')) {
        deviceQuery = `Samsung Galaxy S${model}`;
      }
    }
    if (storage) {
      deviceQuery += ` ${storage}`;
    }

    console.log("Querying device:", deviceQuery);

    // Call Lovable AI using tool calling to force JSON response
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
            content: `Sei un esperto valutatore di dispositivi usati per il mercato italiano. Valuta i prezzi basandoti su eBay, Subito.it, Amazon Renewed, Swappie.

Scala grading italiana:
- B (Discreto): 50-60% del nuovo
- A (Buono): 60-70% del nuovo  
- AA (Ottimo): 70-80% del nuovo
- AAA (Come Nuovo): 80-90% del nuovo

Se il nome è ambiguo (es. "Apple 15"), interpreta come iPhone 15.
Fornisci sempre una stima, anche approssimativa.`
          },
          {
            role: "user",
            content: `Valuta: ${deviceQuery}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_price_estimate",
              description: "Fornisce la stima dei prezzi per un dispositivo usato",
              parameters: {
                type: "object",
                properties: {
                  originalPrice: {
                    type: "number",
                    description: "Prezzo originale di listino del nuovo in EUR"
                  },
                  grades: {
                    type: "object",
                    properties: {
                      B: { type: "number", description: "Prezzo condizione B (Discreto)" },
                      A: { type: "number", description: "Prezzo condizione A (Buono)" },
                      AA: { type: "number", description: "Prezzo condizione AA (Ottimo)" },
                      AAA: { type: "number", description: "Prezzo condizione AAA (Come Nuovo)" }
                    },
                    required: ["B", "A", "AA", "AAA"]
                  },
                  trend: {
                    type: "string",
                    enum: ["alto", "stabile", "basso"],
                    description: "Tendenza del mercato"
                  },
                  trendReason: {
                    type: "string",
                    description: "Breve spiegazione del trend (max 15 parole)"
                  },
                  notes: {
                    type: "string",
                    description: "Nota opzionale sul mercato per questo dispositivo"
                  }
                },
                required: ["originalPrice", "grades", "trend", "trendReason"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_price_estimate" } },
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
    console.log("AI Response:", JSON.stringify(data, null, 2));

    // Extract the tool call arguments
    let priceEstimate;
    try {
      const toolCall = data.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function?.arguments) {
        priceEstimate = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback to content parsing if no tool call
        const content = data.choices[0]?.message?.content || "";
        console.log("No tool call, trying content:", content);
        
        // Try to extract JSON from content
        let cleanedContent = content
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        
        const jsonStart = cleanedContent.indexOf('{');
        if (jsonStart !== -1) {
          const jsonEnd = cleanedContent.lastIndexOf('}');
          if (jsonEnd !== -1) {
            priceEstimate = JSON.parse(cleanedContent.substring(jsonStart, jsonEnd + 1));
          }
        }
        
        if (!priceEstimate) {
          throw new Error("No valid response from AI");
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw data:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Errore nella valutazione. Riprova con marca e modello più specifici (es. 'iPhone 15')." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
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
