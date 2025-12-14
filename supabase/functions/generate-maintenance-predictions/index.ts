import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  created_at: string;
  customer_id: string;
  customer?: {
    id: string;
    centro_id: string | null;
  };
}

interface Repair {
  id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  diagnosis: string | null;
  final_cost: number | null;
  device: Device;
}

interface Prediction {
  device_id: string;
  customer_id: string;
  centro_id: string;
  prediction_type: string;
  urgency: string;
  predicted_issue: string;
  confidence_score: number;
  reasoning: string;
  recommended_action: string;
  estimated_cost: number;
  due_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id, device_id, centro_id, mode = "single" } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine what to analyze
    let devices: Device[] = [];
    let targetCentroId = centro_id;

    if (mode === "single" && device_id) {
      // Single device analysis
      const { data: device, error } = await supabase
        .from("devices")
        .select("*, customer:customers!inner(id, centro_id)")
        .eq("id", device_id)
        .single();

      if (error || !device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      devices = [{ ...device, customer_id: device.customer.id }];
      targetCentroId = device.customer.centro_id;
    } else if (mode === "customer" && customer_id) {
      // All devices for a customer
      const { data, error } = await supabase
        .from("devices")
        .select("*, customer:customers!inner(id, centro_id)")
        .eq("customer_id", customer_id);

      if (error) throw error;
      devices = (data || []).map(d => ({ ...d, customer_id: d.customer.id }));
      if (devices.length > 0) {
        targetCentroId = devices[0].customer?.centro_id;
      }
    } else if (mode === "batch" && centro_id) {
      // All devices for a centro (batch)
      const { data, error } = await supabase
        .from("devices")
        .select("*, customer:customers!inner(id, centro_id)")
        .eq("customer.centro_id", centro_id)
        .limit(50);

      if (error) throw error;
      devices = (data || []).map(d => ({ ...d, customer_id: d.customer.id }));
      targetCentroId = centro_id;
    }

    if (devices.length === 0) {
      return new Response(JSON.stringify({ predictions: [], message: "No devices found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch repair history for all devices
    const deviceIds = devices.map(d => d.id);
    const { data: repairs, error: repairsError } = await supabase
      .from("repairs")
      .select("id, status, created_at, completed_at, diagnosis, final_cost, device_id")
      .in("device_id", deviceIds)
      .order("created_at", { ascending: false });

    if (repairsError) throw repairsError;

    // Group repairs by device
    const repairsByDevice: Record<string, any[]> = {};
    for (const repair of repairs || []) {
      if (!repairsByDevice[repair.device_id]) {
        repairsByDevice[repair.device_id] = [];
      }
      repairsByDevice[repair.device_id].push(repair);
    }

    // Build analysis context for AI
    const analysisContext = devices.map(device => {
      const deviceRepairs = repairsByDevice[device.id] || [];
      const deviceAge = Math.floor(
        (Date.now() - new Date(device.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ); // months

      return {
        device_id: device.id,
        customer_id: device.customer_id,
        device_type: device.device_type,
        brand: device.brand,
        model: device.model,
        age_months: deviceAge,
        repair_count: deviceRepairs.length,
        repairs: deviceRepairs.slice(0, 5).map(r => ({
          date: r.created_at,
          status: r.status,
          diagnosis: r.diagnosis,
          cost: r.final_cost
        })),
        last_repair_date: deviceRepairs[0]?.created_at || null,
        common_issues: deviceRepairs.map(r => r.diagnosis).filter(Boolean)
      };
    });

    // Call Lovable AI for predictions
    const systemPrompt = `Sei un esperto di riparazioni elettroniche con 20 anni di esperienza. Analizza i dispositivi e genera previsioni di manutenzione preventiva basate su:
1. Età del dispositivo
2. Storico riparazioni
3. Pattern comuni per marca/modello
4. Problemi tipici per tipo di dispositivo

Per ogni dispositivo, genera da 0 a 3 previsioni di manutenzione. Non inventare previsioni se non ci sono indicatori reali.

Pattern comuni da considerare:
- iPhone dopo 2+ anni: batteria degrada significativamente
- Samsung Galaxy dopo 18+ mesi: problemi porta USB-C comuni
- Laptop dopo 2+ anni: ventole e pasta termica da sostituire
- Dispositivi con 3+ riparazioni schermo: consigliare protezione
- Smartphone dopo 3+ anni: verificare storage e performance

Rispondi SOLO con JSON valido, senza markdown o testo aggiuntivo.`;

    const userPrompt = `Analizza questi dispositivi e genera previsioni di manutenzione preventiva:

${JSON.stringify(analysisContext, null, 2)}

Rispondi con questo formato JSON esatto:
{
  "predictions": [
    {
      "device_id": "uuid del dispositivo",
      "prediction_type": "battery|screen|charging_port|storage|general_checkup|software|speaker|camera|thermal",
      "urgency": "low|medium|high",
      "predicted_issue": "Descrizione breve del problema previsto",
      "confidence_score": 70,
      "reasoning": "Spiegazione dettagliata del perché questa previsione",
      "recommended_action": "Azione consigliata",
      "estimated_cost": 49,
      "due_date": "2025-03-15"
    }
  ]
}

Se non ci sono previsioni significative per un dispositivo, non includerlo. Genera SOLO previsioni con confidence >= 60.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Clean up markdown if present
    aiContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let parsedPredictions: { predictions: Prediction[] };
    try {
      parsedPredictions = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      parsedPredictions = { predictions: [] };
    }

    // Insert predictions into database
    const predictionsToInsert = (parsedPredictions.predictions || []).map(p => {
      // Find the device to get customer_id
      const device = devices.find(d => d.id === p.device_id);
      return {
        device_id: p.device_id,
        customer_id: device?.customer_id || customer_id,
        centro_id: targetCentroId,
        prediction_type: p.prediction_type,
        urgency: p.urgency || "low",
        predicted_issue: p.predicted_issue,
        confidence_score: p.confidence_score || 70,
        reasoning: p.reasoning,
        recommended_action: p.recommended_action,
        estimated_cost: p.estimated_cost || 0,
        due_date: p.due_date,
        status: "pending"
      };
    }).filter(p => p.device_id && p.customer_id && p.centro_id);

    if (predictionsToInsert.length > 0) {
      // Delete old pending predictions for these devices to avoid duplicates
      await supabase
        .from("maintenance_predictions")
        .delete()
        .in("device_id", predictionsToInsert.map(p => p.device_id))
        .eq("status", "pending");

      const { error: insertError } = await supabase
        .from("maintenance_predictions")
        .insert(predictionsToInsert);

      if (insertError) {
        console.error("Error inserting predictions:", insertError);
      }
    }

    console.log(`Generated ${predictionsToInsert.length} predictions for ${devices.length} devices`);

    return new Response(JSON.stringify({ 
      predictions: predictionsToInsert,
      analyzed_devices: devices.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-maintenance-predictions:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
