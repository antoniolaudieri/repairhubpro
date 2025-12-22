import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthLogRequest {
  customer_email: string;
  centro_id: string;
  device_id?: string;
  source: 'android_native' | 'ios_webapp' | 'manual_quiz';
  
  // Battery metrics
  battery_level?: number;
  battery_health?: string;
  battery_cycles?: number;
  battery_temperature?: number;
  is_charging?: boolean;
  
  // Storage metrics
  storage_total_gb?: number;
  storage_used_gb?: number;
  storage_available_gb?: number;
  
  // RAM metrics
  ram_total_mb?: number;
  ram_available_mb?: number;
  
  // System info
  os_version?: string;
  device_manufacturer?: string;
  device_model_info?: string;
  app_version?: string;
}

interface QuizRequest {
  customer_email: string;
  centro_id: string;
  device_id?: string;
  responses: Record<string, any>;
}

interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

function detectAnomalies(data: HealthLogRequest, settings: any): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Battery anomalies
  if (data.battery_level !== undefined) {
    if (data.battery_level <= (settings?.battery_critical_threshold || 20)) {
      anomalies.push({
        type: 'battery_critical',
        severity: 'critical',
        message: `Livello batteria critico: ${data.battery_level}%`
      });
    } else if (data.battery_level <= (settings?.battery_warning_threshold || 40)) {
      anomalies.push({
        type: 'battery_low',
        severity: 'medium',
        message: `Livello batteria basso: ${data.battery_level}%`
      });
    }
  }
  
  if (data.battery_health && data.battery_health !== 'good' && data.battery_health !== 'unknown') {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'overheat': 'high',
      'dead': 'critical',
      'over_voltage': 'high',
      'cold': 'medium',
      'unspecified_failure': 'high'
    };
    anomalies.push({
      type: 'battery_health',
      severity: severityMap[data.battery_health] || 'medium',
      message: `Problema batteria rilevato: ${data.battery_health}`
    });
  }
  
  // Storage anomalies
  if (data.storage_total_gb && data.storage_used_gb) {
    const storagePercent = (data.storage_used_gb / data.storage_total_gb) * 100;
    if (storagePercent >= (settings?.storage_critical_threshold || 90)) {
      anomalies.push({
        type: 'storage_critical',
        severity: 'critical',
        message: `Spazio di archiviazione quasi esaurito: ${storagePercent.toFixed(1)}% utilizzato`
      });
    } else if (storagePercent >= (settings?.storage_warning_threshold || 80)) {
      anomalies.push({
        type: 'storage_warning',
        severity: 'medium',
        message: `Spazio di archiviazione in esaurimento: ${storagePercent.toFixed(1)}% utilizzato`
      });
    }
  }
  
  // RAM anomalies
  if (data.ram_total_mb && data.ram_available_mb) {
    const ramPercent = ((data.ram_total_mb - data.ram_available_mb) / data.ram_total_mb) * 100;
    if (ramPercent >= 90) {
      anomalies.push({
        type: 'ram_critical',
        severity: 'high',
        message: `Memoria RAM quasi esaurita: ${ramPercent.toFixed(1)}% utilizzata`
      });
    }
  }
  
  return anomalies;
}

function calculateHealthScore(data: HealthLogRequest): number {
  let score = 100;
  let factors = 0;
  
  // Battery score (40% weight)
  if (data.battery_level !== undefined) {
    let batteryScore = data.battery_level;
    if (data.battery_health === 'dead') batteryScore -= 40;
    else if (data.battery_health === 'overheat') batteryScore -= 30;
    else if (data.battery_health === 'over_voltage') batteryScore -= 25;
    else if (data.battery_health === 'cold') batteryScore -= 15;
    else if (data.battery_health === 'unspecified_failure') batteryScore -= 20;
    
    score += Math.max(0, Math.min(100, batteryScore)) * 0.4;
    factors += 0.4;
  }
  
  // Storage score (30% weight)
  if (data.storage_total_gb && data.storage_used_gb) {
    const storagePercent = (data.storage_used_gb / data.storage_total_gb) * 100;
    const storageScore = 100 - storagePercent;
    score += Math.max(0, Math.min(100, storageScore)) * 0.3;
    factors += 0.3;
  }
  
  // RAM score (30% weight)
  if (data.ram_total_mb && data.ram_available_mb) {
    const ramPercent = ((data.ram_total_mb - data.ram_available_mb) / data.ram_total_mb) * 100;
    const ramScore = 100 - ramPercent;
    score += Math.max(0, Math.min(100, ramScore)) * 0.3;
    factors += 0.3;
  }
  
  // Normalize if we have partial data
  if (factors > 0 && factors < 1) {
    score = (score - 100) / factors + 100;
  }
  
  return Math.max(0, Math.min(100, Math.round(score - 100 + (factors > 0 ? 100 : 0))));
}

async function analyzeQuizWithAI(responses: Record<string, any>): Promise<{ score: number; analysis: string; recommendations: string[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback to simple analysis
    return simpleQuizAnalysis(responses);
  }
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Sei un esperto tecnico di dispositivi mobili. Analizza le risposte del questionario diagnostico e fornisci:
1. Un punteggio di salute da 0 a 100
2. Un'analisi breve dei problemi rilevati
3. Raccomandazioni specifiche

Rispondi SOLO in formato JSON valido con questa struttura:
{"score": numero, "analysis": "testo", "recommendations": ["raccomandazione1", "raccomandazione2"]}`
          },
          {
            role: "user",
            content: `Risposte questionario: ${JSON.stringify(responses)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI analysis failed:", response.status);
      return simpleQuizAnalysis(responses);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: parsed.score || 50,
        analysis: parsed.analysis || "Analisi completata",
        recommendations: parsed.recommendations || []
      };
    }
    
    return simpleQuizAnalysis(responses);
  } catch (error) {
    console.error("AI analysis error:", error);
    return simpleQuizAnalysis(responses);
  }
}

function simpleQuizAnalysis(responses: Record<string, any>): { score: number; analysis: string; recommendations: string[] } {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze common quiz responses
  if (responses.battery_drains_fast === true || responses.battery_rating <= 2) {
    score -= 25;
    issues.push("problemi di durata batteria");
    recommendations.push("Consigliamo una diagnosi della batteria");
  }
  
  if (responses.overheating === 'often' || responses.overheating === true) {
    score -= 20;
    issues.push("surriscaldamento frequente");
    recommendations.push("Verificare la pasta termica e la pulizia interna");
  }
  
  if (responses.slowdowns === 'frequent' || responses.performance_rating <= 2) {
    score -= 15;
    issues.push("rallentamenti del sistema");
    recommendations.push("Considerare una pulizia del software e ottimizzazione");
  }
  
  if (responses.storage_low === true || responses.storage_rating <= 2) {
    score -= 10;
    issues.push("spazio di archiviazione insufficiente");
    recommendations.push("Liberare spazio o considerare un upgrade dello storage");
  }
  
  if (responses.crashes === 'often') {
    score -= 20;
    issues.push("crash frequenti delle app");
    recommendations.push("Diagnosi software approfondita consigliata");
  }
  
  const analysis = issues.length > 0 
    ? `Rilevati: ${issues.join(', ')}.`
    : "Nessun problema significativo rilevato.";
  
  if (recommendations.length === 0) {
    recommendations.push("Continua con i check-up periodici per mantenere il dispositivo in salute");
  }
  
  return { score: Math.max(0, score), analysis, recommendations };
}

async function createAlertIfNeeded(
  supabase: any,
  customerId: string,
  centroId: string,
  deviceId: string | null,
  healthScore: number,
  anomalies: Anomaly[],
  settings: any,
  logId?: string,
  quizId?: string
) {
  const criticalThreshold = settings?.health_score_critical_threshold || 40;
  const warningThreshold = settings?.health_score_warning_threshold || 60;
  
  if (healthScore >= warningThreshold && anomalies.length === 0) {
    return; // No alert needed
  }
  
  let alertType = 'general_warning';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let title = '';
  let message = '';
  let discount = 0;
  
  if (healthScore < criticalThreshold) {
    alertType = 'performance_low';
    severity = 'critical';
    title = '🔴 Attenzione urgente richiesta';
    message = `Il tuo dispositivo ha ottenuto un punteggio di salute di ${healthScore}/100. Ti consigliamo una diagnosi approfondita.`;
    if (settings?.auto_discount_on_critical) {
      discount = settings?.critical_discount_percent || 10;
    }
  } else if (healthScore < warningThreshold) {
    severity = 'medium';
    title = '⚠️ Controllo consigliato';
    message = `Il tuo dispositivo mostra alcuni segnali di attenzione (punteggio: ${healthScore}/100).`;
    if (settings?.auto_discount_on_critical) {
      discount = settings?.warning_discount_percent || 5;
    }
  }
  
  // Check for specific critical anomalies
  const criticalAnomaly = anomalies.find(a => a.severity === 'critical');
  if (criticalAnomaly) {
    alertType = criticalAnomaly.type;
    severity = 'critical';
    title = '🔴 Problema critico rilevato';
    message = criticalAnomaly.message;
  }
  
  if (title) {
    const discountCode = discount > 0 ? `HEALTH${discount}` : null;
    
    await supabase.from('device_health_alerts').insert({
      centro_id: centroId,
      customer_id: customerId,
      device_id: deviceId,
      device_health_log_id: logId,
      diagnostic_quiz_id: quizId,
      alert_type: alertType,
      severity,
      title,
      message,
      recommended_action: 'Prenota una diagnosi gratuita',
      discount_offered: discount,
      discount_code: discountCode,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });
  }
}

async function awardBadgeIfEligible(supabase: any, customerId: string, centroId: string) {
  // Check total checkups
  const { count: checkupCount } = await supabase
    .from('device_health_logs')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('centro_id', centroId);
  
  const { count: quizCount } = await supabase
    .from('diagnostic_quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .eq('centro_id', centroId);
  
  const totalCheckups = (checkupCount || 0) + (quizCount || 0);
  
  // First checkup badge
  if (totalCheckups === 1) {
    await supabase.from('customer_health_badges').upsert({
      customer_id: customerId,
      centro_id: centroId,
      badge_type: 'first_checkup',
      badge_name: 'Primo Check-up',
      badge_description: 'Hai completato il tuo primo check-up dispositivo!',
      badge_icon: '🎯'
    }, { onConflict: 'customer_id,centro_id,badge_type' });
  }
  
  // Device Guardian badge (6+ checkups)
  if (totalCheckups >= 6) {
    await supabase.from('customer_health_badges').upsert({
      customer_id: customerId,
      centro_id: centroId,
      badge_type: 'device_guardian',
      badge_name: 'Device Guardian',
      badge_description: 'Hai completato 6+ check-up! Sei un vero guardiano del tuo dispositivo.',
      badge_icon: '🛡️'
    }, { onConflict: 'customer_id,centro_id,badge_type' });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...data } = await req.json();
    console.log(`Device health action: ${action}`);

    switch (action) {
      case 'log_health': {
        const healthData = data as HealthLogRequest;
        
        // Get customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id, centro_id')
          .eq('email', healthData.customer_email)
          .single();
        
        if (customerError || !customer) {
          return new Response(
            JSON.stringify({ error: 'Cliente non trovato' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify loyalty card
        const { data: loyaltyCard } = await supabase
          .from('loyalty_cards')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('centro_id', healthData.centro_id)
          .eq('status', 'active')
          .single();
        
        if (!loyaltyCard) {
          return new Response(
            JSON.stringify({ error: 'Tessera fedeltà non attiva' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get settings
        const { data: settings } = await supabase
          .from('device_health_settings')
          .select('*')
          .eq('centro_id', healthData.centro_id)
          .single();
        
        // Calculate storage percent
        const storagePercentUsed = healthData.storage_total_gb && healthData.storage_used_gb
          ? (healthData.storage_used_gb / healthData.storage_total_gb) * 100
          : null;
        
        // Calculate RAM percent
        const ramPercentUsed = healthData.ram_total_mb && healthData.ram_available_mb
          ? ((healthData.ram_total_mb - healthData.ram_available_mb) / healthData.ram_total_mb) * 100
          : null;
        
        // Detect anomalies
        const anomalies = detectAnomalies(healthData, settings);
        
        // Calculate health score
        const healthScore = calculateHealthScore(healthData);
        
        // Insert log
        const { data: log, error: logError } = await supabase
          .from('device_health_logs')
          .insert({
            customer_id: customer.id,
            centro_id: healthData.centro_id,
            device_id: healthData.device_id,
            loyalty_card_id: loyaltyCard.id,
            source: healthData.source,
            battery_level: healthData.battery_level,
            battery_health: healthData.battery_health,
            battery_cycles: healthData.battery_cycles,
            battery_temperature: healthData.battery_temperature,
            is_charging: healthData.is_charging,
            storage_total_gb: healthData.storage_total_gb,
            storage_used_gb: healthData.storage_used_gb,
            storage_available_gb: healthData.storage_available_gb,
            storage_percent_used: storagePercentUsed,
            ram_total_mb: healthData.ram_total_mb,
            ram_available_mb: healthData.ram_available_mb,
            ram_percent_used: ramPercentUsed,
            os_version: healthData.os_version,
            device_manufacturer: healthData.device_manufacturer,
            device_model_info: healthData.device_model_info,
            app_version: healthData.app_version,
            health_score: healthScore,
            anomalies
          })
          .select()
          .single();
        
        if (logError) {
          console.error('Error inserting health log:', logError);
          throw logError;
        }
        
        // Create alert if needed
        await createAlertIfNeeded(
          supabase,
          customer.id,
          healthData.centro_id,
          healthData.device_id || null,
          healthScore,
          anomalies,
          settings,
          log.id
        );
        
        // Award badges
        await awardBadgeIfEligible(supabase, customer.id, healthData.centro_id);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            health_score: healthScore,
            anomalies,
            log_id: log.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'submit_quiz': {
        const quizData = data as QuizRequest;
        
        // Get customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('email', quizData.customer_email)
          .single();
        
        if (customerError || !customer) {
          return new Response(
            JSON.stringify({ error: 'Cliente non trovato' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Verify loyalty card
        const { data: loyaltyCard } = await supabase
          .from('loyalty_cards')
          .select('id')
          .eq('customer_id', customer.id)
          .eq('centro_id', quizData.centro_id)
          .eq('status', 'active')
          .single();
        
        if (!loyaltyCard) {
          return new Response(
            JSON.stringify({ error: 'Tessera fedeltà non attiva' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Analyze quiz with AI
        const analysis = await analyzeQuizWithAI(quizData.responses);
        
        // Get settings
        const { data: settings } = await supabase
          .from('device_health_settings')
          .select('*')
          .eq('centro_id', quizData.centro_id)
          .single();
        
        // Insert quiz
        const { data: quiz, error: quizError } = await supabase
          .from('diagnostic_quizzes')
          .insert({
            customer_id: customer.id,
            centro_id: quizData.centro_id,
            device_id: quizData.device_id,
            loyalty_card_id: loyaltyCard.id,
            responses: quizData.responses,
            ai_analysis: analysis.analysis,
            health_score: analysis.score,
            recommendations: analysis.recommendations,
            status: 'analyzed',
            analyzed_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (quizError) {
          console.error('Error inserting quiz:', quizError);
          throw quizError;
        }
        
        // Create alert if needed
        const anomalies: Anomaly[] = analysis.score < 60 
          ? [{ type: 'general_warning', severity: 'medium', message: analysis.analysis }]
          : [];
        
        await createAlertIfNeeded(
          supabase,
          customer.id,
          quizData.centro_id,
          quizData.device_id || null,
          analysis.score,
          anomalies,
          settings,
          undefined,
          quiz.id
        );
        
        // Award badges
        await awardBadgeIfEligible(supabase, customer.id, quizData.centro_id);
        
        return new Response(
          JSON.stringify({
            success: true,
            health_score: analysis.score,
            analysis: analysis.analysis,
            recommendations: analysis.recommendations,
            quiz_id: quiz.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'get_health_history': {
        const { customer_email, centro_id, limit = 30 } = data;
        
        // Get customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customer_email)
          .single();
        
        if (!customer) {
          return new Response(
            JSON.stringify({ error: 'Cliente non trovato' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get health logs
        const { data: logs } = await supabase
          .from('device_health_logs')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('centro_id', centro_id)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Get quizzes
        const { data: quizzes } = await supabase
          .from('diagnostic_quizzes')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('centro_id', centro_id)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        // Get badges
        const { data: badges } = await supabase
          .from('customer_health_badges')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('centro_id', centro_id);
        
        // Get pending alerts
        const { data: alerts } = await supabase
          .from('device_health_alerts')
          .select('*')
          .eq('customer_id', customer.id)
          .eq('centro_id', centro_id)
          .in('status', ['pending', 'sent'])
          .order('created_at', { ascending: false });
        
        return new Response(
          JSON.stringify({
            logs: logs || [],
            quizzes: quizzes || [],
            badges: badges || [],
            alerts: alerts || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'verify_access': {
        const { customer_email, centro_id } = data;
        
        // Get customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name')
          .eq('email', customer_email)
          .single();
        
        if (!customer) {
          return new Response(
            JSON.stringify({ hasAccess: false, reason: 'customer_not_found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check loyalty card
        const { data: loyaltyCard } = await supabase
          .from('loyalty_cards')
          .select('id, card_number, expires_at')
          .eq('customer_id', customer.id)
          .eq('centro_id', centro_id)
          .eq('status', 'active')
          .single();
        
        if (!loyaltyCard) {
          return new Response(
            JSON.stringify({ hasAccess: false, reason: 'no_active_loyalty_card' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check if settings allow
        const { data: settings } = await supabase
          .from('device_health_settings')
          .select('is_enabled, android_monitoring_enabled, ios_webapp_enabled')
          .eq('centro_id', centro_id)
          .single();
        
        if (settings && !settings.is_enabled) {
          return new Response(
            JSON.stringify({ hasAccess: false, reason: 'service_disabled' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({
            hasAccess: true,
            customer: {
              id: customer.id,
              name: customer.name
            },
            loyaltyCard: {
              id: loyaltyCard.id,
              cardNumber: loyaltyCard.card_number,
              expiresAt: loyaltyCard.expires_at
            },
            settings: settings || { is_enabled: true, android_monitoring_enabled: true, ios_webapp_enabled: true }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Azione non valida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Device health error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
