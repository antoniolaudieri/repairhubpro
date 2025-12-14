import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  businessType: string;
  promotionType: string;
  companyName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, promotionType, companyName } = await req.json() as GenerateRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Sei un esperto copywriter italiano per pubblicità locali. Genera 3 varianti di testi pubblicitari brevi e accattivanti per:

Tipo attività: ${businessType}
Tipo promozione: ${promotionType}
${companyName ? `Nome azienda: ${companyName}` : ''}

Per ogni variante, genera:
1. Un titolo (max 40 caratteri, incisivo, con un emoji appropriato all'inizio)
2. Una descrizione (max 80 caratteri, call-to-action chiaro)

IMPORTANTE: I testi devono essere in italiano, professionali ma coinvolgenti, adatti a display pubblicitari.

Rispondi SOLO con un JSON valido nel formato:
{
  "variants": [
    {"title": "🔥 Titolo 1", "description": "Descrizione 1"},
    {"title": "⭐ Titolo 2", "description": "Descrizione 2"},
    {"title": "💥 Titolo 3", "description": "Descrizione 3"}
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un copywriter pubblicitario italiano esperto. Rispondi sempre in italiano con JSON valido." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste superato, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti esauriti, contatta il supporto." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.includes("```json")) {
      jsonStr = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonStr = content.split("```")[1].split("```")[0].trim();
    }
    
    const variants = JSON.parse(jsonStr);

    return new Response(JSON.stringify(variants), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-ad-text error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore generazione testi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
