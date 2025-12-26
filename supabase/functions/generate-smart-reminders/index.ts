import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderConfig {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  icon: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customer_id, centro_id, health_data } = await req.json();

    if (!customer_id || !centro_id) {
      throw new Error('customer_id and centro_id are required');
    }

    console.log('[SmartReminders] Generating reminders for customer:', customer_id);

    const reminders: ReminderConfig[] = [];

    // 1. Check battery health
    if (health_data?.battery_health) {
      const batteryHealth = health_data.battery_health.toLowerCase();
      if (batteryHealth !== 'good' && batteryHealth !== 'excellent') {
        // Check if we have 3+ consecutive checks with degraded battery
        const { data: recentLogs } = await supabase
          .from('device_health_logs')
          .select('battery_health')
          .eq('customer_id', customer_id)
          .order('created_at', { ascending: false })
          .limit(3);

        const degradedCount = recentLogs?.filter(
          log => log.battery_health && 
          !['good', 'excellent'].includes(log.battery_health.toLowerCase())
        ).length || 0;

        if (degradedCount >= 3) {
          reminders.push({
            type: 'battery_degradation',
            title: '🔋 Batteria in degrado',
            message: 'La batteria mostra segni di usura. Considera una sostituzione per prestazioni ottimali.',
            severity: 'warning',
            icon: 'battery-warning'
          });
        }
      }
    }

    // 2. Check storage usage
    if (health_data?.storage_percent_used && health_data.storage_percent_used > 85) {
      // Check if storage has been high for a week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: storageLogs } = await supabase
        .from('device_health_logs')
        .select('storage_percent_used, created_at')
        .eq('customer_id', customer_id)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false });

      const highStorageCount = storageLogs?.filter(
        log => log.storage_percent_used && log.storage_percent_used > 85
      ).length || 0;

      if (highStorageCount >= 3) {
        reminders.push({
          type: 'storage_warning',
          title: '💾 Memoria quasi piena',
          message: `Hai utilizzato il ${Math.round(health_data.storage_percent_used)}% della memoria. Libera spazio per prestazioni migliori.`,
          severity: 'warning',
          icon: 'hard-drive'
        });
      }
    }

    // 3. Check repair anniversary
    const { data: repairs } = await supabase
      .from('repairs')
      .select('completed_at')
      .eq('customer_id', customer_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);

    if (repairs && repairs.length > 0 && repairs[0].completed_at) {
      const lastRepairDate = new Date(repairs[0].completed_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastRepairDate < sixMonthsAgo) {
        const monthsSinceRepair = Math.floor(
          (Date.now() - lastRepairDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        reminders.push({
          type: 'repair_anniversary',
          title: '🔧 Check-up consigliato',
          message: `Sono passati ${monthsSinceRepair} mesi dall'ultima riparazione. Prenota un controllo!`,
          severity: 'info',
          icon: 'wrench'
        });
      }
    }

    // 4. Check inactivity
    const { data: lastLog } = await supabase
      .from('device_health_logs')
      .select('created_at')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastLog && lastLog.length > 0) {
      const lastSyncDate = new Date(lastLog[0].created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastSyncDate < thirtyDaysAgo) {
        reminders.push({
          type: 'inactivity',
          title: '📱 Dispositivo non monitorato',
          message: 'Non sincronizzi il dispositivo da tempo. Controlla la salute del tuo telefono!',
          severity: 'info',
          icon: 'clock'
        });
      }
    }

    // 5. Periodic checkup (every 90 days)
    const { data: existingReminder } = await supabase
      .from('smart_reminders')
      .select('created_at')
      .eq('customer_id', customer_id)
      .eq('reminder_type', 'periodic_checkup')
      .order('created_at', { ascending: false })
      .limit(1);

    let shouldSuggestCheckup = true;
    if (existingReminder && existingReminder.length > 0) {
      const lastCheckupReminder = new Date(existingReminder[0].created_at);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      shouldSuggestCheckup = lastCheckupReminder < ninetyDaysAgo;
    }

    if (shouldSuggestCheckup) {
      reminders.push({
        type: 'periodic_checkup',
        title: '📅 Check-up periodico',
        message: 'È ora del controllo trimestrale del tuo dispositivo!',
        severity: 'info',
        icon: 'calendar-check'
      });
    }

    // 6. Low health score
    if (health_data?.health_score && health_data.health_score < 60) {
      reminders.push({
        type: 'low_health_score',
        title: '⚠️ Salute dispositivo bassa',
        message: `Il tuo dispositivo ha un punteggio salute di ${health_data.health_score}/100. Prenota una diagnosi!`,
        severity: 'critical',
        icon: 'alert-triangle'
      });
    }

    // 7. RAM issues
    if (health_data?.ram_percent_used && health_data.ram_percent_used > 90) {
      reminders.push({
        type: 'ram_warning',
        title: '🧠 RAM in esaurimento',
        message: 'La memoria RAM è quasi esaurita. Chiudi alcune app per migliorare le prestazioni.',
        severity: 'warning',
        icon: 'cpu'
      });
    }

    console.log('[SmartReminders] Generated reminders:', reminders.length);

    // Save reminders to database
    if (reminders.length > 0) {
      const reminderInserts = reminders.map(reminder => ({
        customer_id,
        centro_id,
        reminder_type: reminder.type,
        title: reminder.title,
        message: reminder.message,
        severity: reminder.severity,
        icon: reminder.icon,
        status: 'pending',
        scheduled_for: new Date().toISOString()
      }));

      // Check for existing pending reminders of the same type
      for (const reminder of reminderInserts) {
        const { data: existing } = await supabase
          .from('smart_reminders')
          .select('id')
          .eq('customer_id', customer_id)
          .eq('reminder_type', reminder.reminder_type)
          .eq('status', 'pending')
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('smart_reminders').insert(reminder);
          console.log('[SmartReminders] Inserted reminder:', reminder.reminder_type);
        } else {
          console.log('[SmartReminders] Skipping duplicate reminder:', reminder.reminder_type);
        }
      }

      // Also create customer notifications for push
      for (const reminder of reminders) {
        // Get customer email
        const { data: customer } = await supabase
          .from('customers')
          .select('email')
          .eq('id', customer_id)
          .single();

        if (customer?.email) {
          await supabase.from('customer_notifications').insert({
            customer_email: customer.email,
            type: 'smart_reminder',
            title: reminder.title,
            message: reminder.message,
            data: { reminder_type: reminder.type, severity: reminder.severity }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_generated: reminders.length,
        reminders 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SmartReminders] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
