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
    const { 
      diagnosisSummary, 
      deviceType, 
      deviceBrand, 
      deviceModel, 
      purpose,
      checksPerformed 
    } = await req.json();

    console.log("Generating forensic report for:", { deviceType, deviceBrand, deviceModel, purpose });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const purposeLabels: Record<string, string> = {
      avvocato: "Avvocato",
      polizia_postale: "Polizia Postale",
      assicurazione: "Assicurazione",
      altro: "Altro destinatario"
    };

    const checksDescription = checksPerformed
      .map((c: string) => {
        switch (c) {
          case 'malware': return 'scansione antimalware';
          case 'spyware': return 'verifica presenza software spia';
          case 'accounts': return 'verifica account compromessi';
          case 'integrity': return 'verifica integrità dati';
          default: return c;
        }
      })
      .join(', ');

    const systemPrompt = `Sei un esperto tecnico informatico forense italiano. Il tuo compito è generare documenti di perizia tecnica professionale per dispositivi elettronici.

I documenti devono essere:
- Scritti in italiano formale e tecnico
- Strutturati in modo professionale per uso legale/assicurativo
- Dettagliati ma concisi
- Oggettivi e basati sui fatti

Genera SEMPRE risposte in formato JSON valido.`;

    const userPrompt = `Genera una perizia tecnica forense professionale basata su questo riepilogo della diagnosi:

DISPOSITIVO: ${deviceBrand || ''} ${deviceModel || ''} (${deviceType})
DESTINATARIO PERIZIA: ${purposeLabels[purpose] || purpose}
CONTROLLI ESEGUITI: ${checksDescription || 'Analisi generale'}

RIEPILOGO DIAGNOSI DEL TECNICO:
${diagnosisSummary}

Genera un documento JSON con questa struttura:
{
  "analysis_summary": "Descrizione dettagliata delle operazioni di analisi eseguite (3-5 frasi professionali)",
  "malware_findings": "Se applicabile, risultati dettagliati della scansione malware",
  "spyware_findings": "Se applicabile, risultati dettagliati della verifica spyware",
  "compromised_accounts_findings": "Se applicabile, risultati verifica account",
  "data_integrity_findings": "Se applicabile, risultati verifica integrità",
  "other_findings": "Ulteriori osservazioni tecniche rilevanti",
  "conclusions": "Conclusioni tecniche formali della perizia (2-4 frasi)",
  "recommendations": "Raccomandazioni per il cliente (1-3 punti)"
}

Il tono deve essere formale, tecnico e adatto per presentazione in sede legale o assicurativa.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), {
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

    // Parse the JSON response
    let reportData;
    try {
      reportData = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    }

    console.log("Generated report data successfully");

    return new Response(JSON.stringify(reportData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error generating forensic report:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
