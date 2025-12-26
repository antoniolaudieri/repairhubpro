import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellRing, 
  Battery, 
  HardDrive, 
  Calendar, 
  Clock,
  X,
  ChevronRight,
  AlertTriangle,
  Info,
  Lightbulb
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SmartReminder {
  id: string;
  reminder_type: string;
  title: string;
  message: string;
  severity: string;
  trigger_data: unknown;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at: string | null;
}

interface HealthData {
  healthScore?: number;
  batteryLevel?: number | null;
  batteryHealth?: string | null;
  storagePercentUsed?: number | null;
  ramPercentUsed?: number | null;
}

interface SmartRemindersWidgetProps {
  customerId?: string;
  centroId?: string;
  compact?: boolean;
  healthData?: HealthData;
  onReminderAction?: (reminder: SmartReminder, action: 'book' | 'dismiss') => void;
}

export const SmartRemindersWidget = ({
  customerId,
  centroId,
  compact = false,
  healthData,
  onReminderAction
}: SmartRemindersWidgetProps) => {
  const [reminders, setReminders] = useState<SmartReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!customerId || !centroId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('smart_reminders')
        .select('*')
        .eq('customer_id', customerId)
        .eq('centro_id', centroId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('[SmartReminders] Error fetching:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId, centroId]);

  // Generate smart reminders based on health data
  const generateReminders = useCallback(async () => {
    if (!customerId || !centroId || !healthData) return;

    try {
      await supabase.functions.invoke('generate-smart-reminders', {
        body: {
          customer_id: customerId,
          centro_id: centroId,
          health_data: {
            health_score: healthData.healthScore,
            battery_level: healthData.batteryLevel,
            battery_health: healthData.batteryHealth,
            storage_percent_used: healthData.storagePercentUsed,
            ram_percent_used: healthData.ramPercentUsed,
          }
        }
      });
      // Fetch updated reminders after generation
      fetchReminders();
    } catch (error) {
      console.error('[SmartReminders] Error generating:', error);
    }
  }, [customerId, centroId, healthData, fetchReminders]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Generate reminders when health data changes significantly
  useEffect(() => {
    if (healthData?.healthScore !== undefined) {
      generateReminders();
    }
  }, [healthData?.healthScore]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel(`smart_reminders:${customerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_reminders',
          filter: `customer_id=eq.${customerId}`
        },
        () => {
          fetchReminders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, fetchReminders]);

  const dismissReminder = async (reminderId: string) => {
    try {
      await supabase
        .from('smart_reminders')
        .update({ is_dismissed: true })
        .eq('id', reminderId);
      
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('[SmartReminders] Error dismissing:', error);
    }
  };

  const markAsRead = async (reminderId: string) => {
    try {
      await supabase
        .from('smart_reminders')
        .update({ is_read: true })
        .eq('id', reminderId);
      
      setReminders(prev => prev.map(r => 
        r.id === reminderId ? { ...r, is_read: true } : r
      ));
    } catch (error) {
      console.error('[SmartReminders] Error marking as read:', error);
    }
  };

  const getReminderIcon = (type: string) => {
    switch (type) {
      case 'battery_degradation': return <Battery className="h-4 w-4" />;
      case 'storage_warning': return <HardDrive className="h-4 w-4" />;
      case 'repair_anniversary': return <Calendar className="h-4 w-4" />;
      case 'inactivity': return <Clock className="h-4 w-4" />;
      case 'periodic_checkup': return <BellRing className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/30 bg-red-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-blue-500/30 bg-blue-500/5';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="text-xs">Urgente</Badge>;
      case 'warning': return <Badge className="bg-yellow-500 text-xs">Attenzione</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Info</Badge>;
    }
  };

  if (loading || !customerId || !centroId) {
    return null;
  }

  if (reminders.length === 0) {
    if (compact) return null;
    
    return (
      <Card className="bg-green-500/5 border-green-500/20">
        <CardContent className="p-4 text-center">
          <Lightbulb className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm font-medium">Tutto a posto!</p>
          <p className="text-xs text-muted-foreground">
            Nessun promemoria attivo al momento
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    const unreadCount = reminders.filter(r => !r.is_read).length;
    const topReminder = reminders[0];
    
    return (
      <Card className={cn("border", getSeverityStyle(topReminder.severity))}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                topReminder.severity === 'critical' ? "bg-red-500/20 text-red-500" :
                topReminder.severity === 'warning' ? "bg-yellow-500/20 text-yellow-500" :
                "bg-blue-500/20 text-blue-500"
              )}>
                {getReminderIcon(topReminder.reminder_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{topReminder.title}</p>
                <p className="text-xs text-muted-foreground truncate">{topReminder.message}</p>
              </div>
            </div>
            {unreadCount > 1 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                +{unreadCount - 1}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Promemoria Intelligenti
          </CardTitle>
          {reminders.filter(r => !r.is_read).length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {reminders.filter(r => !r.is_read).length} nuovi
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.slice(0, 5).map((reminder) => (
          <div
            key={reminder.id}
            className={cn(
              "rounded-lg border p-3 transition-all",
              getSeverityStyle(reminder.severity),
              !reminder.is_read && "ring-1 ring-primary/20"
            )}
            onClick={() => markAsRead(reminder.id)}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                reminder.severity === 'critical' ? "bg-red-500/20 text-red-500" :
                reminder.severity === 'warning' ? "bg-yellow-500/20 text-yellow-500" :
                "bg-blue-500/20 text-blue-500"
              )}>
                {getReminderIcon(reminder.reminder_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{reminder.title}</p>
                  {getSeverityBadge(reminder.severity)}
                </div>
                <p className="text-xs text-muted-foreground">{reminder.message}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {format(new Date(reminder.created_at), "d MMM, HH:mm", { locale: it })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissReminder(reminder.id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Action buttons for critical/warning */}
            {(reminder.severity === 'critical' || reminder.severity === 'warning') && (
              <div className="flex gap-2 mt-3 ml-11">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReminderAction?.(reminder, 'book');
                  }}
                >
                  Prenota Check-up
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissReminder(reminder.id);
                  }}
                >
                  Ignora
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
