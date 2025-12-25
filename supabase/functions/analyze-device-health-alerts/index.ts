import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthAlert {
  customer_id: string;
  centro_id: string;
  device_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  recommended_action?: string;
  discount_offered?: number;
}

interface HealthLogData {
  id: string;
  centro_id: string;
  customer_id: string;
  device_id?: string;
  health_score?: number;
  battery_level?: number;
  battery_health?: string;
  storage_percent_used?: number;
  storage_available_gb?: number;
  ram_percent_used?: number;
  device_model_info?: string;
  device_manufacturer?: string;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
  };
}

// Generate alerts based on device health data
const analyzeHealthData = (healthLog: HealthLogData, settings: any): HealthAlert[] => {
  const alerts: HealthAlert[] = [];
  const deviceName = healthLog.device_model_info || healthLog.device_manufacturer || 'Dispositivo';

  // Battery critical
  if (healthLog.battery_level !== null && healthLog.battery_level !== undefined) {
    const batteryLevel = healthLog.battery_level;
    
    if (batteryLevel <= (settings?.battery_critical_threshold || 20)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'battery_critical',
        severity: 'critical',
        title: '🔋 Batteria critica rilevata',
        message: `Il tuo ${deviceName} ha solo ${batteryLevel}% di batteria. Una batteria molto scarica frequentemente può danneggiarla permanentemente.`,
        recommended_action: 'Controlla lo stato della batteria presso il centro',
        discount_offered: settings?.critical_discount_percent || 15
      });
    } else if (batteryLevel <= (settings?.battery_warning_threshold || 30)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'battery_warning',
        severity: 'warning',
        title: '⚠️ Batteria bassa',
        message: `Il tuo ${deviceName} ha ${batteryLevel}% di batteria. Considera di ricaricare presto per preservare la salute della batteria.`,
        recommended_action: 'Check-up batteria consigliato',
        discount_offered: settings?.warning_discount_percent || 10
      });
    }
  }

  // Battery health degraded
  if (healthLog.battery_health) {
    const batteryHealth = healthLog.battery_health.toLowerCase();
    if (batteryHealth === 'poor' || batteryHealth === 'critical' || batteryHealth === 'replace') {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'battery_degraded',
        severity: 'critical',
        title: '🔋 Batteria degradata',
        message: `La batteria del tuo ${deviceName} mostra segni di degrado (${healthLog.battery_health}). Potrebbe essere necessaria una sostituzione.`,
        recommended_action: 'Sostituzione batteria consigliata',
        discount_offered: settings?.critical_discount_percent || 15
      });
    }
  }

  // Storage critical
  if (healthLog.storage_percent_used !== null && healthLog.storage_percent_used !== undefined) {
    const storageUsed = healthLog.storage_percent_used;
    
    if (storageUsed >= (settings?.storage_critical_threshold || 95)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'storage_critical',
        severity: 'critical',
        title: '💾 Memoria quasi piena',
        message: `Il tuo ${deviceName} ha il ${storageUsed.toFixed(0)}% della memoria occupata. Spazio rimanente: ${(healthLog.storage_available_gb || 0).toFixed(1)} GB. Il dispositivo potrebbe rallentare significativamente.`,
        recommended_action: 'Ottimizzazione e pulizia storage',
        discount_offered: settings?.critical_discount_percent || 15
      });
    } else if (storageUsed >= (settings?.storage_warning_threshold || 85)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'storage_warning',
        severity: 'warning',
        title: '📦 Memoria in esaurimento',
        message: `Il tuo ${deviceName} sta esaurendo lo spazio (${storageUsed.toFixed(0)}% usato). Considera di liberare spazio.`,
        recommended_action: 'Pulizia e ottimizzazione',
        discount_offered: settings?.warning_discount_percent || 10
      });
    }
  }

  // Health score low
  if (healthLog.health_score !== null && healthLog.health_score !== undefined) {
    const healthScore = healthLog.health_score;
    
    if (healthScore <= (settings?.health_score_critical_threshold || 40)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'health_critical',
        severity: 'critical',
        title: '📱 Salute dispositivo critica',
        message: `Il punteggio di salute del tuo ${deviceName} è ${healthScore}/100. Consigliamo un check-up completo per identificare i problemi.`,
        recommended_action: 'Diagnostica completa urgente',
        discount_offered: settings?.critical_discount_percent || 15
      });
    } else if (healthScore <= (settings?.health_score_warning_threshold || 60)) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'health_warning',
        severity: 'warning',
        title: '⚠️ Salute dispositivo da monitorare',
        message: `Il punteggio di salute del tuo ${deviceName} è ${healthScore}/100. Un check-up preventivo potrebbe evitare problemi futuri.`,
        recommended_action: 'Check-up preventivo consigliato',
        discount_offered: settings?.warning_discount_percent || 10
      });
    }
  }

  // RAM critical
  if (healthLog.ram_percent_used !== null && healthLog.ram_percent_used !== undefined) {
    if (healthLog.ram_percent_used >= 90) {
      alerts.push({
        customer_id: healthLog.customer_id,
        centro_id: healthLog.centro_id,
        device_id: healthLog.device_id,
        alert_type: 'ram_critical',
        severity: 'warning',
        title: '🧠 Memoria RAM sotto pressione',
        message: `Il tuo ${deviceName} sta usando il ${healthLog.ram_percent_used.toFixed(0)}% della RAM. Troppe app aperte possono rallentare il dispositivo.`,
        recommended_action: 'Ottimizzazione app in background'
      });
    }
  }

  return alerts;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { centro_id, customer_id, health_log_id, send_notifications = true } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[AnalyzeHealth] Starting analysis - centro: ${centro_id}, customer: ${customer_id}, log: ${health_log_id}`);

    // Fetch device health settings for this centro
    let settings: any = null;
    if (centro_id) {
      const { data: settingsData } = await supabase
        .from('device_health_settings')
        .select('*')
        .eq('centro_id', centro_id)
        .maybeSingle();
      
      settings = settingsData;
      
      // Check if monitoring is enabled
      if (settings && !settings.is_enabled) {
        console.log('[AnalyzeHealth] Monitoring disabled for this centro');
        return new Response(JSON.stringify({ 
          success: true, 
          alerts: [], 
          message: 'Monitoring disabled' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Determine what health logs to analyze
    let healthLogs: HealthLogData[] = [];

    if (health_log_id) {
      // Analyze specific log
      const { data, error } = await supabase
        .from('device_health_logs')
        .select('*, customer:customers(id, name, email)')
        .eq('id', health_log_id)
        .single();
      
      if (error) throw error;
      if (data) healthLogs = [data as HealthLogData];
    } else if (customer_id && centro_id) {
      // Get latest log for customer
      const { data, error } = await supabase
        .from('device_health_logs')
        .select('*, customer:customers(id, name, email)')
        .eq('customer_id', customer_id)
        .eq('centro_id', centro_id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      healthLogs = (data || []) as HealthLogData[];
    } else if (centro_id) {
      // Get latest logs for all customers in centro (for batch analysis)
      const { data, error } = await supabase
        .from('device_health_logs')
        .select('*, customer:customers(id, name, email)')
        .eq('centro_id', centro_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Keep only the latest log per customer
      const latestByCustomer = new Map<string, HealthLogData>();
      for (const log of (data || []) as HealthLogData[]) {
        if (!latestByCustomer.has(log.customer_id)) {
          latestByCustomer.set(log.customer_id, log);
        }
      }
      healthLogs = Array.from(latestByCustomer.values());
    }

    if (healthLogs.length === 0) {
      console.log('[AnalyzeHealth] No health logs found to analyze');
      return new Response(JSON.stringify({ 
        success: true, 
        alerts: [], 
        message: 'No health logs found' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AnalyzeHealth] Analyzing ${healthLogs.length} health log(s)`);

    // Generate alerts for each health log
    const allAlerts: HealthAlert[] = [];
    
    for (const healthLog of healthLogs) {
      const alerts = analyzeHealthData(healthLog, settings);
      allAlerts.push(...alerts);
    }

    console.log(`[AnalyzeHealth] Generated ${allAlerts.length} alert(s)`);

    if (allAlerts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        alerts: [], 
        message: 'No issues detected' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing active alerts to avoid duplicates
    const uniqueAlerts: HealthAlert[] = [];
    
    for (const alert of allAlerts) {
      const { data: existingAlert } = await supabase
        .from('device_health_alerts')
        .select('id')
        .eq('customer_id', alert.customer_id)
        .eq('centro_id', alert.centro_id)
        .eq('alert_type', alert.alert_type)
        .in('status', ['pending', 'sent'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .maybeSingle();
      
      if (!existingAlert) {
        uniqueAlerts.push(alert);
      }
    }

    console.log(`[AnalyzeHealth] ${uniqueAlerts.length} new unique alert(s) after deduplication`);

    if (uniqueAlerts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        alerts: [], 
        message: 'All alerts already exist' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert alerts into database
    const alertsToInsert = uniqueAlerts.map(alert => ({
      ...alert,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
    }));

    const { data: insertedAlerts, error: insertError } = await supabase
      .from('device_health_alerts')
      .insert(alertsToInsert)
      .select();

    if (insertError) {
      console.error('[AnalyzeHealth] Error inserting alerts:', insertError);
      throw insertError;
    }

    console.log(`[AnalyzeHealth] Inserted ${insertedAlerts?.length || 0} alert(s)`);

    // Send push notifications if enabled
    if (send_notifications && insertedAlerts && insertedAlerts.length > 0) {
      for (const alert of insertedAlerts) {
        try {
          // Get customer's user_id from push_subscriptions via email
          const { data: customer } = await supabase
            .from('customers')
            .select('email')
            .eq('id', alert.customer_id)
            .single();

          if (customer?.email) {
            // Find user_id from auth.users by email
            const { data: subscription } = await supabase
              .from('push_subscriptions')
              .select('user_id')
              .not('user_id', 'is', null)
              .limit(100);

            // We'll try to send to subscribed users who might match
            // In a real scenario, we'd have a proper user<->customer mapping
            
            if (subscription && subscription.length > 0) {
              // For now, we'll create an in-app notification that will trigger push
              await supabase.from('customer_notifications').insert({
                customer_email: customer.email,
                title: alert.title,
                message: alert.message,
                type: `maintenance_${alert.severity}`,
                data: {
                  alert_id: alert.id,
                  alert_type: alert.alert_type,
                  recommended_action: alert.recommended_action,
                  discount_offered: alert.discount_offered
                }
              });

              // Update alert status to sent
              await supabase
                .from('device_health_alerts')
                .update({ 
                  status: 'sent',
                  push_sent_at: new Date().toISOString()
                })
                .eq('id', alert.id);

              console.log(`[AnalyzeHealth] Notification created for customer: ${customer.email}`);
            }
          }
        } catch (notifError) {
          console.error('[AnalyzeHealth] Error sending notification:', notifError);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      alerts: insertedAlerts,
      alerts_count: insertedAlerts?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AnalyzeHealth] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
