import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize issue text to create a category for matching
function normalizeIssue(issue: string): string {
  const lowerIssue = issue.toLowerCase();
  
  // Common issue categories
  if (lowerIssue.includes("schermo") || lowerIssue.includes("display") || lowerIssue.includes("lcd") || lowerIssue.includes("vetro")) {
    return "screen_display";
  }
  if (lowerIssue.includes("batteria") || lowerIssue.includes("battery") || lowerIssue.includes("carica") && lowerIssue.includes("non")) {
    return "battery";
  }
  if (lowerIssue.includes("connettore") || lowerIssue.includes("ricarica") || lowerIssue.includes("charging") || lowerIssue.includes("usb") || lowerIssue.includes("lightning")) {
    return "charging_port";
  }
  if (lowerIssue.includes("fotocamera") || lowerIssue.includes("camera")) {
    return "camera";
  }
  if (lowerIssue.includes("speaker") || lowerIssue.includes("audio") || lowerIssue.includes("altoparlante") || lowerIssue.includes("microfono")) {
    return "audio";
  }
  if (lowerIssue.includes("touch") || lowerIssue.includes("digitizer")) {
    return "touch";
  }
  if (lowerIssue.includes("back") || lowerIssue.includes("cover") || lowerIssue.includes("scocca") || lowerIssue.includes("posteriore")) {
    return "back_cover";
  }
  if (lowerIssue.includes("pulsante") || lowerIssue.includes("button") || lowerIssue.includes("tasto")) {
    return "buttons";
  }
  if (lowerIssue.includes("sim") || lowerIssue.includes("scheda")) {
    return "sim_slot";
  }
  if (lowerIssue.includes("software") || lowerIssue.includes("aggiorna") || lowerIssue.includes("reset")) {
    return "software";
  }
  if (lowerIssue.includes("acqua") || lowerIssue.includes("water") || lowerIssue.includes("liquid") || lowerIssue.includes("bagnato")) {
    return "water_damage";
  }
  
  // Generic repair
  return "general_repair";
}

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
function getFallbackImage(stepTitle: string): string {
  const lowerTitle = stepTitle.toLowerCase();
  
  if (lowerTitle.includes("strument") || lowerTitle.includes("prepara") || lowerTitle.includes("tool")) {
    return "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("apri") || lowerTitle.includes("rimuov") || lowerTitle.includes("smonta")) {
    return "https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("schermo") || lowerTitle.includes("display") || lowerTitle.includes("lcd")) {
    return "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("batteria") || lowerTitle.includes("battery")) {
    return "https://images.unsplash.com/photo-1619641805634-98e018a6ba43?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("connettore") || lowerTitle.includes("ricarica") || lowerTitle.includes("porta")) {
    return "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("fotocamera") || lowerTitle.includes("camera")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("test") || lowerTitle.includes("verifica") || lowerTitle.includes("controllo")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop";
  }
  if (lowerTitle.includes("assembla") || lowerTitle.includes("chiud") || lowerTitle.includes("rimonta")) {
    return "https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=600&h=400&fit=crop";
  }
  
  return "https://images.unsplash.com/photo-1597673030062-0a0f1a801a31?w=600&h=400&fit=crop";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { device_type, brand, model, issue, condition, check_existing = true, save_guide = true } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const issueCategory = normalizeIssue(issue);
    
    console.log("Issue category:", issueCategory, "for issue:", issue);

    // Check for existing guide if requested
    if (check_existing) {
      console.log("Checking for existing guide:", brand, model, issueCategory);
      
      const { data: existingGuide, error: searchError } = await supabase
        .from("repair_guides")
        .select("*")
        .eq("device_brand", brand)
        .eq("device_model", model)
        .eq("issue_category", issueCategory)
        .single();

      if (existingGuide && !searchError) {
        console.log("Found existing guide! Usage count:", existingGuide.usage_count);
        
        // Increment usage count
        await supabase
          .from("repair_guides")
          .update({ usage_count: existingGuide.usage_count + 1 })
          .eq("id", existingGuide.id);

        return new Response(
          JSON.stringify({ 
            guide: existingGuide.guide_data,
            isStructured: true,
            fromCache: true,
            guideId: existingGuide.id,
            usageCount: existingGuide.usage_count + 1,
            suggestions: null
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate new guide
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
      "description": "Descrizione dettagliata specifica per ${brand} ${model}",
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
  "finalNotes": "Note finali e consigli post-riparazione"
}

IMPORTANTE: Includi 6-8 step dettagliati specifici per ${brand} ${model}`;

    console.log("Generating new repair guide for:", brand, model, issue);

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
            content: "Sei un tecnico esperto di riparazione elettronica. Crei guide dettagliate stile iFixit. Rispondi SEMPRE e SOLO con JSON valido, senza markdown."
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
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let guide;
    try {
      guide = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ suggestions: aiContent, isStructured: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate images for steps
    if (guide.steps && Array.isArray(guide.steps)) {
      console.log(`Generating images for ${Math.min(guide.steps.length, 3)} steps...`);
      
      for (let i = 0; i < guide.steps.length; i++) {
        const step = guide.steps[i];
        
        if (i < 3) {
          const generatedImage = await generateStepImage(
            LOVABLE_API_KEY,
            brand,
            model,
            step.title,
            step.description
          );
          step.imageUrl = generatedImage || getFallbackImage(step.title);
        } else {
          step.imageUrl = getFallbackImage(step.title);
        }
      }
    }

    // Save guide to database if requested
    let savedGuideId = null;
    if (save_guide) {
      console.log("Saving guide to database...");
      
      const { data: savedGuide, error: saveError } = await supabase
        .from("repair_guides")
        .upsert({
          device_type,
          device_brand: brand,
          device_model: model,
          issue_category: issueCategory,
          guide_data: guide,
          usage_count: 1
        }, {
          onConflict: "device_brand,device_model,issue_category"
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving guide:", saveError);
      } else {
        savedGuideId = savedGuide?.id;
        console.log("Guide saved with ID:", savedGuideId);
      }
    }

    console.log("Repair guide generated successfully with", guide.steps?.length || 0, "steps");

    return new Response(
      JSON.stringify({ 
        guide,
        isStructured: true,
        fromCache: false,
        guideId: savedGuideId,
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
