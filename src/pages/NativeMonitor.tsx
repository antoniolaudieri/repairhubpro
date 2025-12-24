import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Smartphone, 
  Battery, 
  HardDrive, 
  Wifi, 
  RefreshCw, 
  Upload, 
  LogOut,
  CheckCircle2,
  CreditCard,
  Cpu,
  Monitor,
  Globe,
  Thermometer,
  Signal,
  Clock,
  MapPin,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  MemoryStick,
  Languages,
  Gauge,
  Activity,
  Eye,
  Fingerprint,
  TrendingDown,
  TrendingUp,
  Lightbulb,
  Shield,
  Trash2,
  Settings,
  BatteryWarning,
  Flame,
  Snowflake,
  Info,
  Compass,
  Bell,
  BellRing,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useNativeDeviceInfo } from "@/hooks/useNativeDeviceInfo";
import { useDevicePermissions } from "@/hooks/useDevicePermissions";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SensorWidget } from "@/components/monitor/SensorWidget";
import { BatteryAdvancedWidget } from "@/components/monitor/BatteryAdvancedWidget";
import { BookCheckupWidget } from "@/components/monitor/BookCheckupWidget";
import { DeviceImageWidget } from "@/components/monitor/DeviceImageWidget";
import { AppStorageWidget } from "@/components/monitor/AppStorageWidget";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

interface Appointment {
  id: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  issue_description: string;
  created_at: string;
}

interface LoyaltyCard {
  id: string;
  centro_id: string;
  status: string;
  customer_id: string;
  card_number?: string;
  activated_at?: string;
  expires_at?: string;
  devices_used?: number;
  max_devices?: number;
  centro?: {
    business_name: string;
    logo_url?: string;
  };
}

interface LoyaltyProgramSettings {
  loyalty_program_active?: boolean;
  loyalty_card_price?: number;
  loyalty_discount_percent?: number;
  loyalty_max_devices?: number;
  loyalty_validity_months?: number;
  loyalty_card_bg_color?: string;
  loyalty_card_text_color?: string;
  loyalty_free_checkup_enabled?: boolean;
  loyalty_priority_service?: boolean;
  loyalty_additional_benefits?: string;
}

interface NativeMonitorProps {
  user: User;
}

interface DiagnosticIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  icon: React.ReactNode;
}

interface HealthTip {
  category: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const NativeMonitor = ({ user }: NativeMonitorProps) => {
  const [loyaltyCard, setLoyaltyCard] = useState<LoyaltyCard | null>(null);
  const [programSettings, setProgramSettings] = useState<LoyaltyProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const deviceData = useNativeDeviceInfo();
  const { requestAllPermissions, hasRequested } = useDevicePermissions();
  const pushNotifications = usePushNotifications();

  // Request permissions on mount
  useEffect(() => {
    if (!hasRequested) {
      requestAllPermissions();
    }
  }, [hasRequested, requestAllPermissions]);

  // Fetch notifications and appointments
  useEffect(() => {
    if (!user.email) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("customer_email", user.email)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (data) {
        setNotifications(data as CustomerNotification[]);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    };

    const fetchAppointments = async () => {
      // Find customer IDs by email
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email);

      if (customers && customers.length > 0) {
        const customerIds = customers.map(c => c.id);
        
        // Also try to get appointments by email directly
        const { data: appointmentsByEmail } = await supabase
          .from("appointments")
          .select("*")
          .eq("customer_email", user.email)
          .order("preferred_date", { ascending: false })
          .limit(20);
        
        if (appointmentsByEmail) {
          setAppointments(appointmentsByEmail as Appointment[]);
        }
      } else {
        // Try by email directly
        const { data: appointmentsByEmail } = await supabase
          .from("appointments")
          .select("*")
          .eq("customer_email", user.email)
          .order("preferred_date", { ascending: false })
          .limit(20);
        
        if (appointmentsByEmail) {
          setAppointments(appointmentsByEmail as Appointment[]);
        }
      }
    };

    fetchNotifications();
    fetchAppointments();

    // Subscribe to realtime notifications
    const notificationChannel = supabase
      .channel(`customer-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "customer_notifications",
          filter: `customer_email=eq.${user.email}`,
        },
        (payload) => {
          const newNotification = payload.new as CustomerNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.success(newNotification.title, {
            description: newNotification.message,
            duration: 8000,
          });
        }
      )
      .subscribe();

    // Subscribe to appointment updates
    const appointmentChannel = supabase
      .channel(`customer-appointments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `customer_email=eq.${user.email}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Appointment;
            setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
            
            // Show toast for status changes
            if (updated.status === "confirmed") {
              toast.success("Prenotazione Confermata! ✅", {
                description: `Il tuo appuntamento del ${format(new Date(updated.preferred_date), "d MMMM", { locale: it })} alle ${updated.preferred_time} è stato confermato`,
                duration: 10000,
              });
            } else if (updated.status === "cancelled") {
              toast.error("Prenotazione Annullata ❌", {
                description: `La prenotazione del ${format(new Date(updated.preferred_date), "d MMMM", { locale: it })} è stata annullata`,
                duration: 10000,
              });
            }
          } else if (payload.eventType === "INSERT") {
            const newApp = payload.new as Appointment;
            setAppointments(prev => [newApp, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(appointmentChannel);
    };
  }, [user.email, user.id]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("customer_notifications")
      .update({ read: true })
      .eq("id", notificationId);
    
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user.email) return;
    
    await supabase
      .from("customer_notifications")
      .update({ read: true })
      .eq("customer_email", user.email)
      .eq("read", false);
    
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Enable push notifications
  const handleEnablePush = async () => {
    const success = await pushNotifications.subscribe();
    if (success) {
      toast.success("Notifiche push attivate!", {
        description: "Riceverai aggiornamenti anche quando l'app è chiusa",
      });
    } else {
      toast.error("Impossibile attivare le notifiche", {
        description: "Controlla i permessi nelle impostazioni del dispositivo",
      });
    }
  };

  // Generate health tips based on device data
  const generateHealthTips = useCallback((): HealthTip[] => {
    const tips: HealthTip[] = [];
    
    // Battery tips
    if (deviceData.batteryLevel !== null && deviceData.batteryLevel < 30 && !deviceData.isCharging) {
      tips.push({
        category: 'Batteria',
        title: 'Risparmio Energetico',
        description: 'Attiva la modalità risparmio energetico per prolungare la durata della batteria. Riduci la luminosità e disattiva funzioni non essenziali.',
        icon: <Battery className="h-4 w-4" />
      });
    }
    
    if (deviceData.isCharging) {
      tips.push({
        category: 'Batteria',
        title: 'Ricarica Ottimale',
        description: 'Per preservare la salute della batteria, evita di caricare oltre l\'80% frequentemente e non scaricare sotto il 20%.',
        icon: <Zap className="h-4 w-4" />
      });
    }
    
    // Storage tips
    if (deviceData.storagePercentUsed !== null && deviceData.storagePercentUsed > 70) {
      tips.push({
        category: 'Memoria',
        title: 'Libera Spazio',
        description: 'Elimina foto duplicate, svuota la cache delle app e rimuovi le app inutilizzate per liberare spazio.',
        icon: <Trash2 className="h-4 w-4" />
      });
    }
    
    // RAM tips
    if (deviceData.ramPercentUsed !== null && deviceData.ramPercentUsed > 75) {
      tips.push({
        category: 'Prestazioni',
        title: 'Chiudi App in Background',
        description: 'Troppe app in background rallentano il dispositivo. Chiudi quelle non utilizzate per migliorare le prestazioni.',
        icon: <Settings className="h-4 w-4" />
      });
    }
    
    // Network tips
    if (deviceData.connectionEffectiveType === 'slow-2g' || deviceData.connectionEffectiveType === '2g') {
      tips.push({
        category: 'Rete',
        title: 'Connessione Lenta',
        description: 'La connessione è molto lenta. Cerca una rete WiFi o spostati in un\'area con miglior copertura.',
        icon: <Signal className="h-4 w-4" />
      });
    }
    
    // General maintenance
    tips.push({
      category: 'Manutenzione',
      title: 'Controllo Periodico',
      description: 'Sincronizza regolarmente i dati del dispositivo per monitorare la salute nel tempo e ricevere avvisi preventivi.',
      icon: <Shield className="h-4 w-4" />
    });
    
    return tips;
  }, [deviceData]);

  // Analyze device for issues - more comprehensive
  const analyzeIssues = useCallback((): DiagnosticIssue[] => {
    const issues: DiagnosticIssue[] = [];
    
    // === BATTERY ISSUES ===
    if (deviceData.batteryLevel !== null) {
      if (deviceData.batteryLevel < 5) {
        issues.push({
          severity: 'critical',
          category: 'Batteria',
          title: 'Batteria Critica',
          description: `Livello batteria estremamente basso (${deviceData.batteryLevel}%). Il dispositivo potrebbe spegnersi.`,
          recommendation: 'Collegare immediatamente il caricatore per evitare lo spegnimento.',
          icon: <BatteryWarning className="h-4 w-4" />
        });
      } else if (deviceData.batteryLevel < 15) {
        issues.push({
          severity: 'critical',
          category: 'Batteria',
          title: 'Batteria Molto Bassa',
          description: `Livello batteria molto basso (${deviceData.batteryLevel}%).`,
          recommendation: 'Collegare il caricatore il prima possibile.',
          icon: <Battery className="h-4 w-4" />
        });
      } else if (deviceData.batteryLevel < 25) {
        issues.push({
          severity: 'warning',
          category: 'Batteria',
          title: 'Batteria Bassa',
          description: `Livello batteria basso (${deviceData.batteryLevel}%).`,
          recommendation: 'Si consiglia di ricaricare presto il dispositivo.',
          icon: <Battery className="h-4 w-4" />
        });
      }
    }
    
    // Battery health issues
    if (deviceData.batteryHealth === 'overheat') {
      issues.push({
        severity: 'critical',
        category: 'Batteria',
        title: 'Surriscaldamento Batteria',
        description: 'La batteria è surriscaldata. Questo può danneggiare il dispositivo.',
        recommendation: 'Spegnere il dispositivo, rimuovere dalla luce solare diretta e attendere che si raffreddi.',
        icon: <Flame className="h-4 w-4" />
      });
    } else if (deviceData.batteryHealth === 'cold') {
      issues.push({
        severity: 'warning',
        category: 'Batteria',
        title: 'Batteria Fredda',
        description: 'La batteria è troppo fredda per funzionare correttamente.',
        recommendation: 'Portare il dispositivo in un ambiente più caldo prima dell\'uso.',
        icon: <Snowflake className="h-4 w-4" />
      });
    } else if (deviceData.batteryHealth === 'dead' || deviceData.batteryHealth === 'unspecified_failure') {
      issues.push({
        severity: 'critical',
        category: 'Batteria',
        title: 'Batteria Guasta',
        description: 'La batteria presenta problemi gravi e potrebbe necessitare sostituzione.',
        recommendation: 'Portare il dispositivo in assistenza per verifica e possibile sostituzione batteria.',
        icon: <BatteryWarning className="h-4 w-4" />
      });
    }
    
    // === STORAGE ISSUES ===
    if (deviceData.storagePercentUsed !== null) {
      if (deviceData.storagePercentUsed > 98) {
        issues.push({
          severity: 'critical',
          category: 'Memoria',
          title: 'Memoria Quasi Piena',
          description: `Spazio quasi esaurito (${deviceData.storagePercentUsed.toFixed(1)}%). Il dispositivo potrebbe non funzionare correttamente.`,
          recommendation: 'Eliminare immediatamente file, foto, video o app per liberare spazio.',
          icon: <HardDrive className="h-4 w-4" />
        });
      } else if (deviceData.storagePercentUsed > 95) {
        issues.push({
          severity: 'critical',
          category: 'Memoria',
          title: 'Memoria Critica',
          description: `Spazio quasi esaurito (${deviceData.storagePercentUsed.toFixed(1)}%). Potrebbero verificarsi problemi.`,
          recommendation: 'Liberare almeno 1-2 GB di spazio eliminando file non necessari.',
          icon: <HardDrive className="h-4 w-4" />
        });
      } else if (deviceData.storagePercentUsed > 90) {
        issues.push({
          severity: 'warning',
          category: 'Memoria',
          title: 'Memoria Insufficiente',
          description: `Lo spazio sta terminando (${deviceData.storagePercentUsed.toFixed(1)}%).`,
          recommendation: 'Svuotare la cache delle app e rimuovere file non necessari.',
          icon: <HardDrive className="h-4 w-4" />
        });
      } else if (deviceData.storagePercentUsed > 80) {
        issues.push({
          severity: 'info',
          category: 'Memoria',
          title: 'Spazio in Esaurimento',
          description: `Lo spazio di archiviazione è al ${deviceData.storagePercentUsed.toFixed(1)}%.`,
          recommendation: 'Considerare di fare pulizia periodica per mantenere prestazioni ottimali.',
          icon: <HardDrive className="h-4 w-4" />
        });
      }
    }
    
    // === RAM ISSUES ===
    if (deviceData.ramPercentUsed !== null) {
      if (deviceData.ramPercentUsed > 95) {
        issues.push({
          severity: 'critical',
          category: 'RAM',
          title: 'Memoria RAM Critica',
          description: `RAM quasi esaurita (${deviceData.ramPercentUsed.toFixed(0)}%). Il dispositivo potrebbe bloccarsi.`,
          recommendation: 'Chiudere immediatamente le app non utilizzate e riavviare il dispositivo.',
          icon: <MemoryStick className="h-4 w-4" />
        });
      } else if (deviceData.ramPercentUsed > 90) {
        issues.push({
          severity: 'warning',
          category: 'RAM',
          title: 'RAM Sotto Pressione',
          description: `Memoria RAM elevata (${deviceData.ramPercentUsed.toFixed(0)}%). Potrebbero verificarsi rallentamenti.`,
          recommendation: 'Chiudere alcune app in background per migliorare le prestazioni.',
          icon: <MemoryStick className="h-4 w-4" />
        });
      } else if (deviceData.ramPercentUsed > 80) {
        issues.push({
          severity: 'info',
          category: 'RAM',
          title: 'Utilizzo RAM Elevato',
          description: `La RAM è utilizzata all\'${deviceData.ramPercentUsed.toFixed(0)}%.`,
          recommendation: 'Normale durante l\'uso intensivo, ma considera di chiudere app pesanti.',
          icon: <MemoryStick className="h-4 w-4" />
        });
      }
    }
    
    // === NETWORK ISSUES ===
    if (!deviceData.networkConnected || !deviceData.onlineStatus) {
      issues.push({
        severity: 'critical',
        category: 'Rete',
        title: 'Nessuna Connessione',
        description: 'Il dispositivo non è connesso a internet.',
        recommendation: 'Verificare WiFi o dati mobili. Provare a attivare/disattivare la modalità aereo.',
        icon: <Wifi className="h-4 w-4" />
      });
    } else {
      // Connection quality issues
      if (deviceData.connectionEffectiveType === 'slow-2g') {
        issues.push({
          severity: 'warning',
          category: 'Rete',
          title: 'Connessione Molto Lenta',
          description: 'Velocità 2G lenta. Streaming e download saranno molto lenti.',
          recommendation: 'Cercare una rete WiFi o spostarsi in zona con miglior copertura.',
          icon: <Signal className="h-4 w-4" />
        });
      } else if (deviceData.connectionEffectiveType === '2g') {
        issues.push({
          severity: 'warning',
          category: 'Rete',
          title: 'Connessione Lenta',
          description: 'Connessione 2G. La navigazione potrebbe essere lenta.',
          recommendation: 'Preferire il WiFi per operazioni che richiedono banda.',
          icon: <Signal className="h-4 w-4" />
        });
      } else if (deviceData.connectionEffectiveType === '3g') {
        issues.push({
          severity: 'info',
          category: 'Rete',
          title: 'Connessione Media',
          description: 'Connessione 3G. Adeguata per navigazione, lenta per streaming HD.',
          recommendation: 'Connessione accettabile per uso normale.',
          icon: <Signal className="h-4 w-4" />
        });
      }
      
      // Latency issues
      if (deviceData.connectionRtt !== null) {
        if (deviceData.connectionRtt > 1000) {
          issues.push({
            severity: 'warning',
            category: 'Rete',
            title: 'Latenza Molto Elevata',
            description: `Tempo di risposta molto alto (${deviceData.connectionRtt}ms). Connessione instabile.`,
            recommendation: 'La connessione potrebbe essere instabile. Provare a riconnettersi.',
            icon: <Activity className="h-4 w-4" />
          });
        } else if (deviceData.connectionRtt > 500) {
          issues.push({
            severity: 'info',
            category: 'Rete',
            title: 'Latenza Elevata',
            description: `Tempo di risposta elevato (${deviceData.connectionRtt}ms).`,
            recommendation: 'Potrebbe causare ritardi in app real-time come videochiamate.',
            icon: <Activity className="h-4 w-4" />
          });
        }
      }
      
      // Bandwidth issues
      if (deviceData.connectionDownlink !== null && deviceData.connectionDownlink < 1) {
        issues.push({
          severity: 'warning',
          category: 'Rete',
          title: 'Banda Limitata',
          description: `Velocità download molto bassa (${deviceData.connectionDownlink} Mbps).`,
          recommendation: 'Download e streaming saranno molto lenti. Preferire WiFi se disponibile.',
          icon: <TrendingDown className="h-4 w-4" />
        });
      }
    }
    
    // === HARDWARE ISSUES ===
    if (deviceData.deviceMemoryGb !== null && deviceData.deviceMemoryGb < 2) {
      issues.push({
        severity: 'info',
        category: 'Hardware',
        title: 'RAM Limitata',
        description: `Il dispositivo ha solo ${deviceData.deviceMemoryGb}GB di RAM.`,
        recommendation: 'Evitare di aprire troppe app contemporaneamente per prestazioni migliori.',
        icon: <Cpu className="h-4 w-4" />
      });
    }
    
    if (deviceData.cpuCores !== null && deviceData.cpuCores < 4) {
      issues.push({
        severity: 'info',
        category: 'Hardware',
        title: 'Processore Base',
        description: `Processore con ${deviceData.cpuCores} core. Prestazioni base.`,
        recommendation: 'Potrebbe essere lento con app pesanti o multitasking intensivo.',
        icon: <Cpu className="h-4 w-4" />
      });
    }
    
    // Note: Screen resolution is NOT flagged as an issue - it's just device info, not a problem
    
    return issues;
  }, [deviceData]);

  const issues = analyzeIssues();
  const healthTips = generateHealthTips();
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  // Fetch active loyalty card
  const fetchLoyaltyCard = useCallback(async () => {
    try {
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email);

      if (!customers || customers.length === 0) {
        setLoyaltyCard(null);
        setLoading(false);
        return;
      }

      const customerIds = customers.map(c => c.id);

      const { data, error } = await supabase
        .from("loyalty_cards")
        .select(`
          id, 
          centro_id, 
          status, 
          customer_id, 
          card_number, 
          activated_at, 
          expires_at, 
          devices_used, 
          max_devices,
          centro:centri_assistenza(business_name, logo_url)
        `)
        .in("customer_id", customerIds)
        .eq("status", "active")
        .not("expires_at", "is", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching loyalty card:", error);
        setLoyaltyCard(null);
      } else if (data) {
        // Flatten the centro relationship
        const cardWithCentro = {
          ...data,
          centro: Array.isArray(data.centro) ? data.centro[0] : data.centro
        };
        setLoyaltyCard(cardWithCentro as LoyaltyCard);
        
        // Fetch program settings from the loyalty_program_settings table
        const { data: loyaltySettings } = await supabase
          .from("loyalty_program_settings")
          .select("*")
          .eq("centro_id", data.centro_id)
          .eq("is_active", true)
          .maybeSingle();
        
        if (loyaltySettings) {
          setProgramSettings({
            loyalty_program_active: loyaltySettings.is_active,
            loyalty_card_price: loyaltySettings.annual_price,
            loyalty_discount_percent: loyaltySettings.repair_discount_percent,
            loyalty_max_devices: loyaltySettings.max_devices,
            loyalty_validity_months: loyaltySettings.validity_months,
            loyalty_card_bg_color: loyaltySettings.card_accent_color || '#10b981',
            loyalty_card_text_color: loyaltySettings.card_text_color || '#ffffff',
            loyalty_free_checkup_enabled: loyaltySettings.diagnostic_fee === 0,
            loyalty_priority_service: true, // Always enabled for loyalty customers
            loyalty_additional_benefits: loyaltySettings.promo_tagline,
          });
        }
      } else {
        setLoyaltyCard(null);
      }
    } catch (err) {
      console.error("Error:", err);
      setLoyaltyCard(null);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchLoyaltyCard();
  }, [fetchLoyaltyCard]);

  const handleSync = async () => {
    if (!loyaltyCard) {
      toast.error("Nessuna tessera fedeltà attiva");
      return;
    }

    if (deviceData.isLoading) {
      toast.error("Dati dispositivo non disponibili");
      return;
    }

    // Map battery health to valid DB values
    const validBatteryHealthValues = ['good', 'overheat', 'dead', 'over_voltage', 'unspecified_failure', 'cold', 'unknown'];
    let batteryHealthValue = deviceData.batteryHealth || 'unknown';
    if (!validBatteryHealthValues.includes(batteryHealthValue)) {
      // Map invalid values
      if (batteryHealthValue === 'charging' || batteryHealthValue === 'fair') {
        batteryHealthValue = 'good';
      } else if (batteryHealthValue === 'low') {
        batteryHealthValue = 'unspecified_failure';
      } else {
        batteryHealthValue = 'unknown';
      }
    }

    setSyncing(true);
    try {
      const { error: insertError } = await supabase
        .from("device_health_logs")
        .insert({
          centro_id: loyaltyCard.centro_id,
          customer_id: loyaltyCard.customer_id,
          loyalty_card_id: loyaltyCard.id,
          source: "android_native",
          battery_level: deviceData.batteryLevel,
          battery_health: batteryHealthValue,
          is_charging: deviceData.isCharging,
          storage_total_gb: deviceData.storageTotalGb,
          storage_used_gb: deviceData.storageUsedGb,
          storage_available_gb: deviceData.storageAvailableGb,
          storage_percent_used: deviceData.storagePercentUsed,
          ram_total_mb: deviceData.ramTotalMb,
          ram_available_mb: deviceData.ramAvailableMb,
          ram_percent_used: deviceData.ramPercentUsed,
          device_model_info: deviceData.deviceModel,
          device_manufacturer: deviceData.deviceManufacturer,
          os_version: deviceData.osVersion,
          network_type: deviceData.networkType,
          network_connected: deviceData.networkConnected,
          online_status: deviceData.onlineStatus,
          screen_width: deviceData.screenWidth,
          screen_height: deviceData.screenHeight,
          pixel_ratio: deviceData.pixelRatio,
          color_depth: deviceData.colorDepth,
          orientation: deviceData.orientation,
          cpu_cores: deviceData.cpuCores,
          device_memory_gb: deviceData.deviceMemoryGb,
          hardware_concurrency: deviceData.hardwareConcurrency,
          touch_support: deviceData.touchSupport,
          max_touch_points: deviceData.maxTouchPoints,
          timezone: deviceData.timezone,
          language: deviceData.language,
          latitude: deviceData.latitude,
          longitude: deviceData.longitude,
          health_score: deviceData.healthScore,
          connection_downlink: deviceData.connectionDownlink,
          connection_effective_type: deviceData.connectionEffectiveType,
          connection_rtt: deviceData.connectionRtt,
        });

      if (insertError) throw insertError;
      toast.success("Dati sincronizzati con successo!");
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Errore durante la sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleRefresh = async () => {
    await deviceData.refresh?.();
    toast.success("Dati aggiornati");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loyaltyCard) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <Card className="border-destructive/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Tessera Non Attiva</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Non hai una tessera fedeltà attiva associata a questo account.
              </p>
              <p className="text-sm text-muted-foreground">Email: {user.email}</p>
              <Button variant="outline" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Esci
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Eccellente';
    if (score >= 80) return 'Molto Buono';
    if (score >= 70) return 'Buono';
    if (score >= 60) return 'Discreto';
    if (score >= 50) return 'Sufficiente';
    if (score >= 40) return 'Scarso';
    return 'Critico';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getProgressColor = (value: number, inverted: boolean = false) => {
    const effective = inverted ? 100 - value : value;
    if (effective >= 80) return 'bg-green-500';
    if (effective >= 60) return 'bg-yellow-500';
    if (effective >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loyaltyCard.centro?.logo_url ? (
              <img 
                src={loyaltyCard.centro.logo_url} 
                alt={loyaltyCard.centro.business_name || "Centro"} 
                className="h-8 w-8 rounded-full object-cover bg-white"
              />
            ) : (
              <Smartphone className="h-6 w-6" />
            )}
            <div>
              <h1 className="font-semibold">Device Health Pro</h1>
              <p className="text-xs opacity-80 truncate max-w-[180px]">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className={`h-5 w-5 ${deviceData.isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Device Image + Health Score Banner */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device Image Widget */}
        <DeviceImageWidget
          manufacturer={deviceData.deviceManufacturer}
          model={deviceData.deviceModel}
          platform={deviceData.platform}
        />

        {/* Health Score Card */}
        <Card className="overflow-hidden">
          <div className={`h-2 ${getHealthBg(deviceData.healthScore)}`} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stato Salute Dispositivo</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getHealthColor(deviceData.healthScore)}`}>
                    {deviceData.healthScore}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                  <Badge variant="outline" className={getHealthColor(deviceData.healthScore)}>
                    {getHealthLabel(deviceData.healthScore)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceData.deviceManufacturer} {deviceData.deviceModel || 'Dispositivo'}
                </p>
              </div>
              <div className="text-right">
                {issues.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">Tutto OK</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 items-end">
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {criticalCount} Critici
                      </Badge>
                    )}
                    {warningCount > 0 && (
                      <Badge className="bg-yellow-500 text-xs">
                        {warningCount} Avvisi
                      </Badge>
                    )}
                    {infoCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {infoCount} Info
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pb-24">
        {/* Tab Navigation - Scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <TabsList className="inline-flex min-w-max gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="text-sm px-3 py-2 whitespace-nowrap">
              📊 Stato
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-sm px-3 py-2 whitespace-nowrap flex items-center gap-1">
              🔔 Notifiche
              {unreadCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="apps" className="text-sm px-3 py-2 whitespace-nowrap">
              📱 App
            </TabsTrigger>
            <TabsTrigger value="hardware" className="text-sm px-3 py-2 whitespace-nowrap">
              🔧 Hardware
            </TabsTrigger>
            <TabsTrigger value="sensors" className="text-sm px-3 py-2 whitespace-nowrap">
              🧭 Sensori
            </TabsTrigger>
            <TabsTrigger value="network" className="text-sm px-3 py-2 whitespace-nowrap">
              📶 Rete
            </TabsTrigger>
            <TabsTrigger value="issues" className="text-sm px-3 py-2 whitespace-nowrap flex items-center gap-1">
              ⚠️ Problemi
              {issues.length > 0 && (
                <span className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                  {issues.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tips" className="text-sm px-3 py-2 whitespace-nowrap">
              💡 Consigli
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 space-y-3">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-3 m-0">
            {/* Loyalty Card - Full Display */}
            <Card 
              className="overflow-hidden border-2"
              style={{
                backgroundColor: programSettings?.loyalty_card_bg_color || '#10b981',
                borderColor: programSettings?.loyalty_card_bg_color || '#10b981',
              }}
            >
              <CardContent className="p-4 space-y-4" style={{ color: programSettings?.loyalty_card_text_color || 'white' }}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {loyaltyCard.centro?.logo_url ? (
                      <img 
                        src={loyaltyCard.centro.logo_url} 
                        alt={loyaltyCard.centro.business_name}
                        className="h-12 w-12 rounded-lg object-cover bg-white/20"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                        <CreditCard className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-lg">{loyaltyCard.centro?.business_name || 'Centro'}</p>
                      <p className="text-sm opacity-80">Tessera Fedeltà</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-inherit border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Attiva
                  </Badge>
                </div>

                {/* Card Number */}
                {loyaltyCard.card_number && (
                  <div className="bg-white/10 rounded-lg p-3 text-center">
                    <p className="text-xs opacity-70">Numero Tessera</p>
                    <p className="font-mono text-xl font-bold tracking-wider">{loyaltyCard.card_number}</p>
                  </div>
                )}

                {/* Dates & Usage */}
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-70">Attivata</p>
                    <p className="font-medium">
                      {loyaltyCard.activated_at 
                        ? new Date(loyaltyCard.activated_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '--'}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-70">Scade</p>
                    <p className="font-medium">
                      {loyaltyCard.expires_at 
                        ? new Date(loyaltyCard.expires_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '--'}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-70">Riparazioni</p>
                    <p className="font-medium">{loyaltyCard.devices_used || 0}/{loyaltyCard.max_devices || programSettings?.loyalty_max_devices || '∞'}</p>
                  </div>
                </div>

                {/* Days Remaining */}
                {loyaltyCard.expires_at && (
                  <div className="text-center">
                    {(() => {
                      const daysLeft = Math.ceil((new Date(loyaltyCard.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return daysLeft <= 30 ? (
                        <p className="text-sm bg-white/20 rounded-lg py-2 px-3">
                          ⏰ Scade tra <strong>{daysLeft}</strong> giorni - Ricorda di rinnovare!
                        </p>
                      ) : (
                        <p className="text-sm opacity-80">
                          ✓ Valida per altri <strong>{daysLeft}</strong> giorni
                        </p>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Benefits Card */}
            {programSettings && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🎁 I Tuoi Benefici
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {programSettings.loyalty_discount_percent && programSettings.loyalty_discount_percent > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
                      <span className="text-green-600">✓</span>
                      <span><strong>{programSettings.loyalty_discount_percent}%</strong> di sconto su tutte le riparazioni</span>
                    </div>
                  )}
                  {programSettings.loyalty_free_checkup_enabled && (
                    <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg">
                      <span className="text-blue-600">✓</span>
                      <span>Checkup diagnostico <strong>gratuito</strong></span>
                    </div>
                  )}
                  {programSettings.loyalty_priority_service && (
                    <div className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg">
                      <span className="text-purple-600">✓</span>
                      <span>Servizio <strong>prioritario</strong></span>
                    </div>
                  )}
                  {programSettings.loyalty_max_devices && programSettings.loyalty_max_devices > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                      <span className="text-amber-600">✓</span>
                      <span>Valida per <strong>{programSettings.loyalty_max_devices}</strong> riparazioni</span>
                    </div>
                  )}
                  {programSettings.loyalty_additional_benefits && (
                    <div className="text-sm text-muted-foreground p-2 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Altri benefici:</p>
                      <p>{programSettings.loyalty_additional_benefits}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Book Checkup Widget */}
            {loyaltyCard && (
              <BookCheckupWidget
                centroId={loyaltyCard.centro_id}
                customerId={loyaltyCard.customer_id}
                customerEmail={user.email || ""}
                customerName={user.email?.split("@")[0] || "Cliente"}
                deviceInfo={{
                  model: deviceData.deviceModel,
                  manufacturer: deviceData.deviceManufacturer,
                  healthScore: deviceData.healthScore,
                }}
              />
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-3 m-0">
            {/* Push Notification Banner */}
            {!pushNotifications.isSubscribed && pushNotifications.isSupported && (
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <BellRing className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">Attiva le Notifiche Push</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ricevi aggiornamenti sulle tue prenotazioni anche quando l'app è chiusa
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-3"
                        onClick={handleEnablePush}
                        disabled={pushNotifications.isLoading}
                      >
                        {pushNotifications.isLoading ? "Attivazione..." : "Attiva Notifiche"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {pushNotifications.isSubscribed && (
              <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <CardContent className="p-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-300">Notifiche push attive</span>
                </CardContent>
              </Card>
            )}

            {/* Appointments Section */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Le Tue Prenotazioni
                  </CardTitle>
                  <Badge variant="outline">{appointments.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna prenotazione trovata
                  </p>
                ) : (
                  appointments.slice(0, 5).map((appointment) => (
                    <div 
                      key={appointment.id} 
                      className={`p-3 rounded-lg border ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200' 
                          : appointment.status === 'cancelled'
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-200'
                          : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {format(new Date(appointment.preferred_date), "d MMMM yyyy", { locale: it })}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {appointment.preferred_time}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {appointment.device_brand} {appointment.device_model || appointment.device_type}
                          </p>
                        </div>
                        <Badge 
                          className={`text-xs ${
                            appointment.status === 'confirmed' 
                              ? 'bg-green-500' 
                              : appointment.status === 'cancelled'
                              ? 'bg-red-500'
                              : appointment.status === 'completed'
                              ? 'bg-blue-500'
                              : 'bg-yellow-500'
                          }`}
                        >
                          {appointment.status === 'pending' ? 'In Attesa' :
                           appointment.status === 'confirmed' ? 'Confermata' :
                           appointment.status === 'cancelled' ? 'Annullata' :
                           appointment.status === 'completed' ? 'Completata' : appointment.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Notifications List */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifiche Recenti
                  </CardTitle>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                      Segna tutte come lette
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna notifica
                  </p>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.read 
                          ? 'bg-muted/30' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: it })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Apps Tab - Storage per app */}
          <TabsContent value="apps" className="space-y-3 m-0">
            <AppStorageWidget onRefresh={() => deviceData.refresh?.()} />
          </TabsContent>

          {/* Hardware Tab - Battery Card moved here */}
          <TabsContent value="hardware" className="space-y-3 m-0">
            {/* Battery Card - Enhanced */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Battery className={`h-5 w-5 ${deviceData.isCharging ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className="font-medium">Batteria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {deviceData.isCharging && (
                      <Badge variant="outline" className="text-green-600 border-green-500 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        In carica
                      </Badge>
                    )}
                    {deviceData.batteryHealth && deviceData.batteryHealth !== 'unknown' && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {deviceData.batteryHealth}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Livello</span>
                    <span className="font-medium">
                      {deviceData.batteryLevel !== null ? `${Math.round(deviceData.batteryLevel)}%` : '--'}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={deviceData.batteryLevel || 0} 
                      className="h-3"
                    />
                  </div>
                  
                  {/* Battery estimation */}
                  {deviceData.batteryLevel !== null && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Stima durata</p>
                        <p className="font-medium">
                          {deviceData.isCharging 
                            ? 'In ricarica...'
                            : deviceData.batteryLevel > 80 
                              ? '> 8 ore'
                              : deviceData.batteryLevel > 50
                                ? '4-8 ore'
                                : deviceData.batteryLevel > 20
                                  ? '1-4 ore'
                                  : '< 1 ora'}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-muted-foreground">Efficienza</p>
                        <p className="font-medium">
                          {deviceData.batteryHealth === 'good' 
                            ? 'Ottima'
                            : deviceData.batteryHealth === 'fair'
                              ? 'Buona'
                              : deviceData.batteryHealth === 'charging'
                                ? 'In carica'
                                : 'Da verificare'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Storage Card - Enhanced */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Memoria Interna</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Utilizzata</span>
                    <span className="font-medium">
                      {deviceData.storagePercentUsed !== null ? `${deviceData.storagePercentUsed.toFixed(1)}%` : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={deviceData.storagePercentUsed || 0} 
                    className="h-3"
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="font-medium text-foreground">
                        {deviceData.storageTotalGb?.toFixed(1) || '--'}
                      </p>
                      <p className="text-muted-foreground">GB Totali</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="font-medium text-foreground">
                        {deviceData.storageUsedGb?.toFixed(1) || '--'}
                      </p>
                      <p className="text-muted-foreground">GB Usati</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="font-medium text-foreground text-green-600">
                        {deviceData.storageAvailableGb?.toFixed(1) || '--'}
                      </p>
                      <p className="text-muted-foreground">GB Liberi</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RAM Card - Enhanced */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Memoria RAM</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Utilizzo attuale</span>
                    <span className="font-medium">
                      {deviceData.ramPercentUsed !== null ? `${Math.round(deviceData.ramPercentUsed)}%` : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={deviceData.ramPercentUsed || 0} 
                    className="h-3"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="font-medium text-foreground">
                        {deviceData.deviceMemoryGb ? `${deviceData.deviceMemoryGb} GB` : '--'}
                      </p>
                      <p className="text-muted-foreground">RAM Totale</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="font-medium text-foreground text-green-600">
                        {deviceData.ramAvailableMb ? `${(deviceData.ramAvailableMb / 1024).toFixed(1)} GB` : '--'}
                      </p>
                      <p className="text-muted-foreground">RAM Libera</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Status Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Wifi className={`h-5 w-5 mx-auto mb-1 ${deviceData.networkConnected ? 'text-green-500' : 'text-red-500'}`} />
                  <p className="text-xs font-medium">{deviceData.networkConnected ? 'Online' : 'Offline'}</p>
                  <p className="text-xs text-muted-foreground uppercase">{deviceData.connectionEffectiveType || '--'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Cpu className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium">{deviceData.cpuCores || '--'} Core</p>
                  <p className="text-xs text-muted-foreground">{deviceData.platform}</p>
                </CardContent>
              </Card>
            </div>

            {/* Book Checkup Widget */}
            {loyaltyCard && (
              <BookCheckupWidget
                centroId={loyaltyCard.centro_id}
                customerId={loyaltyCard.customer_id}
                customerEmail={user.email || ''}
                customerName={user.email?.split('@')[0] || 'Cliente'}
                deviceInfo={{
                  model: deviceData.deviceModel,
                  manufacturer: deviceData.deviceManufacturer,
                  healthScore: deviceData.healthScore
                }}
              />
            )}
          </TabsContent>

          {/* Hardware Tab */}
          <TabsContent value="hardware" className="space-y-3 m-0">
            {/* Battery Advanced Info */}
            <BatteryAdvancedWidget
              level={deviceData.batteryLevel}
              isCharging={deviceData.isCharging}
              health={deviceData.batteryHealth}
              temperature={deviceData.batteryTemperature}
              voltage={deviceData.batteryVoltage}
              technology={deviceData.batteryTechnology}
              plugged={deviceData.batteryPlugged}
            />
            {/* Device Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Informazioni Dispositivo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Modello</p>
                    <p className="font-medium">{deviceData.deviceModel || '--'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Produttore</p>
                    <p className="font-medium">{deviceData.deviceManufacturer || '--'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Sistema</p>
                    <p className="font-medium capitalize">{deviceData.platform} {deviceData.osVersion || ''}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">App</p>
                    <p className="font-medium">v{deviceData.appVersion || '1.0.0'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CPU */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Processore e Memoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-2xl font-bold">{deviceData.cpuCores || '--'}</p>
                    <p className="text-xs text-muted-foreground">Core CPU</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-2xl font-bold">{deviceData.deviceMemoryGb || '--'}</p>
                    <p className="text-xs text-muted-foreground">GB RAM</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-2xl font-bold">{deviceData.hardwareConcurrency || '--'}</p>
                    <p className="text-xs text-muted-foreground">Thread</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Screen */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Schermo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Risoluzione</p>
                    <p className="font-medium">
                      {deviceData.screenWidth && deviceData.screenHeight 
                        ? `${deviceData.screenWidth} × ${deviceData.screenHeight}` 
                        : '--'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Densità</p>
                    <p className="font-medium">
                      {deviceData.pixelRatio ? `${deviceData.pixelRatio}x (${Math.round(deviceData.pixelRatio * 160)} DPI)` : '--'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Colori</p>
                    <p className="font-medium">
                      {deviceData.colorDepth ? `${deviceData.colorDepth} bit` : '--'}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Orientamento</p>
                    <p className="font-medium capitalize">
                      {deviceData.orientation?.replace('-primary', '').replace('-secondary', '') || '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Touch & Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Touch e Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Touch</p>
                    <p className="font-medium flex items-center gap-1">
                      {deviceData.touchSupport ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Supportato
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-red-500" />
                          Non supportato
                        </>
                      )}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Multi-touch</p>
                    <p className="font-medium">{deviceData.maxTouchPoints || 0} punti</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Locale */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Localizzazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Lingua</p>
                    <p className="font-medium">{deviceData.language || '--'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs">Fuso Orario</p>
                    <p className="font-medium text-xs">{deviceData.timezone || '--'}</p>
                  </div>
                </div>
                {deviceData.latitude && deviceData.longitude && (
                  <div className="mt-3 bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Posizione (approssimativa)
                    </p>
                    <p className="font-medium text-sm">
                      {deviceData.latitude.toFixed(4)}, {deviceData.longitude.toFixed(4)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sensors Tab */}
          <TabsContent value="sensors" className="space-y-3 m-0">
            <SensorWidget 
              sensors={deviceData.sensors}
              onRefresh={() => deviceData.refresh?.()}
            />
            
            {/* Additional sensor info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  Informazioni Sensori
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  I sensori permettono al dispositivo di rilevare movimenti, orientamento, luce ambientale e altro.
                  Tocca "Test" per verificare il funzionamento di ciascun sensore.
                </p>
                <div className="flex items-start gap-2 text-xs">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>Alcuni sensori potrebbero richiedere permessi specifici o non essere disponibili su tutti i dispositivi.</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-3 m-0">
            {/* Connection Status */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    deviceData.networkConnected ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {deviceData.networkConnected ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-lg">
                      {deviceData.networkConnected ? 'Connesso' : 'Disconnesso'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {deviceData.networkType || 'Tipo sconosciuto'}
                    </p>
                    {deviceData.connectionEffectiveType && (
                      <Badge variant="outline" className="mt-1 uppercase">
                        {deviceData.connectionEffectiveType}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Quality */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Qualità Connessione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Speed */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Velocità Download</span>
                    <span className="font-medium">
                      {deviceData.connectionDownlink !== null 
                        ? `${deviceData.connectionDownlink} Mbps` 
                        : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min((deviceData.connectionDownlink || 0) / 50 * 100, 100)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Lento</span>
                    <span>Veloce</span>
                  </div>
                </div>
                
                {/* Latency */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Latenza (RTT)</span>
                    <span className="font-medium">
                      {deviceData.connectionRtt !== null 
                        ? `${deviceData.connectionRtt} ms` 
                        : '--'}
                    </span>
                  </div>
                  <Progress 
                    value={Math.max(0, 100 - (deviceData.connectionRtt || 0) / 10)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Alta latenza</span>
                    <span>Bassa latenza</span>
                  </div>
                </div>
                
                {/* Quality assessment */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Valutazione Qualità</p>
                  <div className="flex items-center gap-2">
                    {deviceData.connectionDownlink !== null && deviceData.connectionRtt !== null ? (
                      deviceData.connectionDownlink > 10 && deviceData.connectionRtt < 100 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Eccellente per streaming e videochiamate</span>
                        </>
                      ) : deviceData.connectionDownlink > 5 && deviceData.connectionRtt < 300 ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">Buona per navigazione e social</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-600">Limitata - solo navigazione base</span>
                        </>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">Dati non disponibili</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Type Legend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Guida Tipi Connessione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded">
                    <Badge className="bg-green-500 text-xs">4G/LTE</Badge>
                    <span>Ottima - streaming HD, download veloci</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded">
                    <Badge className="bg-yellow-500 text-xs">3G</Badge>
                    <span>Buona - navigazione, email, social</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded">
                    <Badge className="bg-orange-500 text-xs">2G</Badge>
                    <span>Lenta - solo testo e immagini base</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded">
                    <Badge className="bg-blue-500 text-xs">WiFi</Badge>
                    <span>Variabile - dipende dalla rete</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-3 m-0">
            {issues.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-xl">Nessun Problema Rilevato</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Il tuo dispositivo funziona correttamente!
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Continua a monitorare regolarmente per mantenere le prestazioni ottimali.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {criticalCount > 0 && (
                    <Badge variant="destructive">{criticalCount} Critici</Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge className="bg-yellow-500">{warningCount} Avvisi</Badge>
                  )}
                  {infoCount > 0 && (
                    <Badge variant="secondary">{infoCount} Informazioni</Badge>
                  )}
                </div>

                {/* Critical Issues */}
                {criticalCount > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Problemi Critici
                    </h3>
                    {issues.filter(i => i.severity === 'critical').map((issue, index) => (
                      <Card key={index} className="border-red-500/30 bg-red-500/5">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="shrink-0">
                              {issue.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{issue.title}</h4>
                                <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <div className="mt-2 p-2 bg-red-500/10 rounded text-xs">
                                <strong>Consiglio:</strong> {issue.recommendation}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {warningCount > 0 && (
                  <div className="space-y-2 mt-4">
                    <h3 className="text-sm font-medium text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Avvisi
                    </h3>
                    {issues.filter(i => i.severity === 'warning').map((issue, index) => (
                      <Card key={index} className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="shrink-0">
                              {issue.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{issue.title}</h4>
                                <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <div className="mt-2 p-2 bg-yellow-500/10 rounded text-xs">
                                <strong>Consiglio:</strong> {issue.recommendation}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Info */}
                {infoCount > 0 && (
                  <Accordion type="single" collapsible className="mt-4">
                    <AccordionItem value="info">
                      <AccordionTrigger className="text-sm">
                        <span className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          {infoCount} Informazioni aggiuntive
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {issues.filter(i => i.severity === 'info').map((issue, index) => (
                          <Card key={index} className="border-blue-500/30 bg-blue-500/5">
                            <CardContent className="p-3">
                              <div className="flex gap-3">
                                <div className="shrink-0">{issue.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm">{issue.title}</h4>
                                  <p className="text-xs text-muted-foreground">{issue.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </>
            )}
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-3 m-0">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-sm">Consigli Personalizzati</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Suggerimenti basati sullo stato attuale del tuo dispositivo per mantenerlo in salute.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {healthTips.map((tip, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {tip.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{tip.title}</h4>
                        <Badge variant="outline" className="text-xs">{tip.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* General tips */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Best Practice Generali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Riavvia il dispositivo almeno una volta a settimana</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Mantieni sempre aggiornato il sistema operativo</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Evita di scaricare app da fonti non ufficiali</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Svuota periodicamente la cache delle app</span>
                </div>
                <div className="flex items-start gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <span>Non lasciare la batteria scaricarsi completamente</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Fixed Sync Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t safe-area-inset-bottom z-20">
        <Button 
          className="w-full h-14 text-base font-medium shadow-lg"
          size="lg"
          onClick={handleSync}
          disabled={syncing || deviceData.isLoading}
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Sincronizzazione...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Sincronizza con Centro
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NativeMonitor;
