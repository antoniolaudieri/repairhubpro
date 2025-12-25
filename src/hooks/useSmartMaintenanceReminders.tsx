import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseSmartMaintenanceRemindersOptions {
  centroId?: string;
  customerId?: string;
  enabled?: boolean;
  onAlertReceived?: (alerts: any[]) => void;
}

export const useSmartMaintenanceReminders = ({
  centroId,
  customerId,
  enabled = true,
  onAlertReceived
}: UseSmartMaintenanceRemindersOptions) => {
  const { toast } = useToast();
  const lastAnalysisRef = useRef<Date | null>(null);
  const isAnalyzingRef = useRef(false);

  // Analyze device health and generate alerts
  const analyzeHealthAndNotify = useCallback(async (healthLogId?: string) => {
    if (!centroId || !customerId || !enabled) {
      console.log('[SmartReminders] Skipping analysis - missing centroId or customerId or disabled');
      return null;
    }

    // Debounce - don't analyze more than once every 5 minutes
    if (lastAnalysisRef.current) {
      const timeSinceLastAnalysis = Date.now() - lastAnalysisRef.current.getTime();
      if (timeSinceLastAnalysis < 5 * 60 * 1000) {
        console.log('[SmartReminders] Skipping - analyzed recently');
        return null;
      }
    }

    if (isAnalyzingRef.current) {
      console.log('[SmartReminders] Skipping - analysis in progress');
      return null;
    }

    isAnalyzingRef.current = true;

    try {
      console.log('[SmartReminders] Starting health analysis...');
      
      const { data, error } = await supabase.functions.invoke('analyze-device-health-alerts', {
        body: {
          centro_id: centroId,
          customer_id: customerId,
          health_log_id: healthLogId,
          send_notifications: true
        }
      });

      if (error) {
        console.error('[SmartReminders] Analysis error:', error);
        throw error;
      }

      lastAnalysisRef.current = new Date();
      console.log('[SmartReminders] Analysis result:', data);

      if (data?.alerts && data.alerts.length > 0) {
        // Show local toast for immediate feedback
        const criticalAlerts = data.alerts.filter((a: any) => a.severity === 'critical');
        const warningAlerts = data.alerts.filter((a: any) => a.severity === 'warning');

        if (criticalAlerts.length > 0) {
          toast({
            title: '🚨 Attenzione richiesta',
            description: `Rilevati ${criticalAlerts.length} problema/i critico/i. Controlla le notifiche.`,
            variant: 'destructive'
          });
        } else if (warningAlerts.length > 0) {
          toast({
            title: '⚠️ Suggerimenti manutenzione',
            description: `${warningAlerts.length} suggerimento/i per migliorare il tuo dispositivo.`,
          });
        }

        onAlertReceived?.(data.alerts);
      }

      return data;
    } catch (error) {
      console.error('[SmartReminders] Failed to analyze health:', error);
      return null;
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [centroId, customerId, enabled, toast, onAlertReceived]);

  // Get pending alerts for this customer
  const getPendingAlerts = useCallback(async () => {
    if (!customerId || !centroId) return [];

    try {
      const { data, error } = await supabase
        .from('device_health_alerts')
        .select('*')
        .eq('customer_id', customerId)
        .eq('centro_id', centroId)
        .in('status', ['pending', 'sent'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SmartReminders] Failed to fetch alerts:', error);
      return [];
    }
  }, [customerId, centroId]);

  // Mark alert as viewed
  const markAlertViewed = useCallback(async (alertId: string) => {
    try {
      await supabase
        .from('device_health_alerts')
        .update({ 
          status: 'viewed',
          customer_viewed_at: new Date().toISOString()
        })
        .eq('id', alertId);
    } catch (error) {
      console.error('[SmartReminders] Failed to mark alert viewed:', error);
    }
  }, []);

  // Respond to alert
  const respondToAlert = useCallback(async (alertId: string, response: 'book' | 'dismiss' | 'later') => {
    try {
      await supabase
        .from('device_health_alerts')
        .update({ 
          status: response === 'dismiss' ? 'dismissed' : 'responded',
          customer_response: response,
          customer_response_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (response === 'book') {
        toast({
          title: '✅ Prenotazione avviata',
          description: 'Contatta il centro per completare la prenotazione.'
        });
      }
    } catch (error) {
      console.error('[SmartReminders] Failed to respond to alert:', error);
    }
  }, [toast]);

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!customerId || !enabled) return;

    const channel = supabase
      .channel(`device_health_alerts:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'device_health_alerts',
          filter: `customer_id=eq.${customerId}`
        },
        (payload) => {
          console.log('[SmartReminders] New alert received:', payload);
          const alert = payload.new as any;
          
          // Show toast for new alert
          toast({
            title: alert.title,
            description: alert.message,
            variant: alert.severity === 'critical' ? 'destructive' : 'default'
          });

          onAlertReceived?.([alert]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, enabled, toast, onAlertReceived]);

  return {
    analyzeHealthAndNotify,
    getPendingAlerts,
    markAlertViewed,
    respondToAlert
  };
};
