import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deviceBrand, deviceModel, reportedIssue, availableParts } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Suggesting parts for ${deviceBrand} ${deviceModel} with issue: ${reportedIssue}`);

    const systemPrompt = `Sei un esperto tecnico di riparazione smartphone e dispositivi elettronici.
Analizza il difetto segnalato e suggerisci i ricambi necessari per la riparazione.

Rispondi SOLO con un array JSON di oggetti, senza testo aggiuntivo.
Ogni oggetto deve avere:
- "partName": nome del ricambio (es. "Display LCD", "Batteria", "Connettore di ricarica")
- "reason": breve spiegazione del perché questo ricambio è necessario

Esempi di ricambi comuni:
- Display LCD / Schermo OLED
- Batteria
- Connettore di ricarica
- Porta USB-C / Lightning
- Fotocamera anteriore / posteriore
- Altoparlante / Speaker
- Microfono
- Tasto accensione / volume
- Vetro posteriore
- Flex antenna
- Scheda madre (nei casi gravi)

Suggerisci da 1 a 4 ricambi in base alla gravità del problema.`;

    const userPrompt = `Dispositivo: ${deviceBrand || 'Non specificato'} ${deviceModel || ''}
Difetto segnalato: ${reportedIssue}

Ricambi disponibili in magazzino: ${availableParts?.map((p: any) => p.name).join(', ') || 'Nessuno'}

Quali ricambi sono necessari per questa riparazione?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', suggestions: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse JSON from response
    let suggestions = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-spare-parts:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
