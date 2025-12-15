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
      const lowerBrand = brand.toLowerCase();
      if (lowerBrand.includes('apple') || lowerBrand === 'iphone' || lowerBrand === 'ipad') {
        deviceQuery = `Apple iPhone ${model}`;
      } else if (lowerBrand.includes('samsung')) {
        deviceQuery = `Samsung Galaxy S${model}`;
      }
    }

    console.log("Querying device:", deviceQuery, "storage:", storage || "all");

    // Determine if we should return multiple storage options or single
    const wantsMultipleStorage = !storage;

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
            content: `Sei un esperto valutatore di dispositivi usati per il mercato italiano/europeo. 

FONTI DI RIFERIMENTO PREZZI (in ordine di priorità):
1. Swappie.com - RIFERIMENTO PRINCIPALE per smartphone ricondizionati in Europa. I prezzi Swappie sono il benchmark per "Come Nuovo".
2. BackMarket.it - Secondo riferimento per ricondizionati certificati
3. Amazon Renewed Italia - Per comparazione
4. eBay.it e Subito.it - Per usato privato (prezzi più bassi)

SCALA GRADING E PREZZI REALISTICI:
- B (Discreto/Buone condizioni): 40-50% del prezzo Swappie "Come Nuovo"
- A (Buono/Molto buone condizioni): 55-65% del prezzo Swappie "Come Nuovo"
- AA (Ottimo/Eccellente): 70-80% del prezzo Swappie "Come Nuovo"
- AAA (Come Nuovo/Pari al nuovo): Prezzo Swappie "Come Nuovo" o "Eccellente" (-5/10%)

REGOLE IMPORTANTI:
- Il prezzo AAA deve essere INFERIORE al prezzo del nuovo di almeno 20-30%
- Usa i prezzi REALI di mercato attuali, non percentuali fisse
- Per iPhone: controlla il prezzo Swappie attuale per quel modello specifico
- Per Samsung: usa BackMarket come riferimento primario
- Se il dispositivo è vecchio (>3 anni), i prezzi calano più rapidamente

Se il nome è ambiguo (es. "Apple 15"), interpreta come iPhone 15.
Fornisci sempre stime basate su prezzi di mercato REALI e ATTUALI.
${wantsMultipleStorage ? 'IMPORTANTE: Fornisci stime per TUTTE le capacità di storage disponibili per questo dispositivo.' : ''}`
          },
          {
            role: "user",
            content: storage 
              ? `Valuta il prezzo di mercato reale per: ${deviceQuery} ${storage}. Usa Swappie.com come riferimento principale.` 
              : `Valuta i prezzi di mercato reali per: ${deviceQuery} - Fornisci i prezzi per TUTTE le capacità di storage. Usa Swappie.com come benchmark per i prezzi "Come Nuovo".`
          }
        ],
        tools: [
          wantsMultipleStorage 
            ? {
                type: "function",
                function: {
                  name: "provide_multi_storage_estimate",
                  description: "Fornisce stime di prezzo per tutte le capacità di storage di un dispositivo",
                  parameters: {
                    type: "object",
                    properties: {
                      storageOptions: {
                        type: "array",
                        description: "Array delle stime per ogni capacità di storage disponibile",
                        items: {
                          type: "object",
                          properties: {
                            storage: {
                              type: "string",
                              description: "Capacità storage (es. 64GB, 128GB, 256GB, 512GB, 1TB)"
                            },
                            originalPrice: {
                              type: "number",
                              description: "Prezzo attuale su Swappie/BackMarket per condizione 'Come Nuovo' in EUR"
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
                            }
                          },
                          required: ["storage", "originalPrice", "grades"]
                        }
                      },
                      trend: {
                        type: "string",
                        enum: ["alto", "stabile", "basso"],
                        description: "Tendenza del mercato per questo dispositivo"
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
                    required: ["storageOptions", "trend", "trendReason"]
                  }
                }
              }
            : {
                type: "function",
                function: {
                  name: "provide_price_estimate",
                  description: "Fornisce la stima dei prezzi per un dispositivo usato",
                  parameters: {
                    type: "object",
                    properties: {
                      originalPrice: {
                        type: "number",
                        description: "Prezzo attuale su Swappie/BackMarket per condizione 'Come Nuovo' in EUR"
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
        tool_choice: { 
          type: "function", 
          function: { name: wantsMultipleStorage ? "provide_multi_storage_estimate" : "provide_price_estimate" } 
        },
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
        const parsed = JSON.parse(toolCall.function.arguments);
        
        // If multi-storage response, convert to keyed object
        if (parsed.storageOptions && Array.isArray(parsed.storageOptions)) {
          const multiEstimate: Record<string, any> = {};
          for (const option of parsed.storageOptions) {
            multiEstimate[option.storage] = {
              originalPrice: option.originalPrice,
              grades: option.grades,
              trend: parsed.trend,
              trendReason: parsed.trendReason,
              notes: parsed.notes
            };
          }
          priceEstimate = multiEstimate;
        } else {
          // Single storage response
          priceEstimate = parsed;
        }
      } else {
        // Fallback to content parsing if no tool call
        const content = data.choices[0]?.message?.content || "";
        console.log("No tool call, trying content:", content);
        
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
