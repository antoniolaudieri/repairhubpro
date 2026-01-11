import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Play, Pause, Settings, Zap, Clock, Mail, 
  RefreshCw, AlertCircle, CheckCircle, Loader2,
  Server, Shield, Eye, EyeOff, FlaskConical, Send,
  MapPin, Users, XCircle, Phone, Trash2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from_email: string;
}

interface FoundLead {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  businessType: 'centro' | 'corner';
  source: 'firecrawl' | 'osm';
  isNew: boolean;
  zone?: string;
}

interface ScanProgress {
  isScanning: boolean;
  totalZones: number;
  currentZoneIndex: number;
  currentZoneName: string;
  totalLeadsFound: number;
  leadsWithEmail: number;
  leadsPhoneOnly: number;
  osmLeadsFound: number;
  firecrawlLeadsFound: number;
  errors: string[];
  completedZones: string[];
  foundLeads: FoundLead[];
  duplicatesSkipped: number;
}

interface EmailProcessingProgress {
  isProcessing: boolean;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

export function AutomationTab() {
  const queryClient = useQueryClient();
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
  const [emailProgress, setEmailProgress] = useState<EmailProcessingProgress>({
    isProcessing: false,
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testBusinessName, setTestBusinessName] = useState("Test Riparazioni Srl");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from_email: "",
  });
  
  // Scan source selection
  const [scanSource, setScanSource] = useState<"both" | "osm" | "firecrawl">("both");

  // Scan progress state
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    totalZones: 0,
    currentZoneIndex: 0,
    currentZoneName: "",
    totalLeadsFound: 0,
    leadsWithEmail: 0,
    leadsPhoneOnly: 0,
    osmLeadsFound: 0,
    firecrawlLeadsFound: 0,
    errors: [],
    completedZones: [],
    foundLeads: [],
    duplicatesSkipped: 0,
  });
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'email' | 'duplicate'>('all');

  // Fetch automation settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["marketing-automation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_automation_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Sync SMTP form with settings when loaded
  useEffect(() => {
    if (settings?.smtp_config) {
      const config = settings.smtp_config as unknown as SmtpConfig;
      setSmtpForm({
        host: config.host || "",
        port: config.port || 587,
        secure: config.secure || false,
        user: config.user || "",
        password: config.password || "",
        from_email: config.from_email || "",
      });
    }
  }, [settings]);

  // Fetch recent logs
  const { data: logs = [] } = useQuery({
    queryKey: ["marketing-automation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_automation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Fetch queue stats
  const { data: queueStats } = useQuery({
    queryKey: ["marketing-email-queue-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_email_queue")
        .select("status");
      if (error) throw error;
      
      return {
        pending: data.filter(e => e.status === "pending").length,
        sent: data.filter(e => e.status === "sent").length,
        failed: data.filter(e => e.status === "failed").length,
        processing: data.filter(e => e.status === "processing").length,
      };
    },
    refetchInterval: 10000,
  });

  // Check for invalid emails in leads
  const { data: invalidEmailsCount = 0 } = useQuery({
    queryKey: ["marketing-invalid-emails-count"],
    queryFn: async () => {
      const imageExtensions = ['%.png', '%.svg', '%.jpg', '%.jpeg', '%.gif', '%.webp', '%.ico', '%.bmp'];
      const { count, error } = await supabase
        .from("marketing_leads")
        .select("*", { count: "exact", head: true })
        .or(imageExtensions.map(ext => `email.ilike.${ext}`).join(','));
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // State for cleanup operation
  const [isCleaningEmails, setIsCleaningEmails] = useState(false);

  // Fetch unsubscribe stats
  const { data: unsubStats } = useQuery({
    queryKey: ["marketing-unsubscribe-stats"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("marketing_unsubscribes")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return { count: count || 0 };
    },
  });

  // Fetch templates for test dialog
  const { data: templates = [] } = useQuery({
    queryKey: ["marketing-templates-for-test"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_templates")
        .select("id, name, type")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("marketing_automation_settings")
        .update(updates)
        .eq("id", settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-automation-settings"] });
      toast.success("Impostazioni aggiornate");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento");
    },
  });

  // Save SMTP config
  const saveSmtpConfig = () => {
    updateSettingsMutation.mutate({ 
      smtp_config: smtpForm,
    });
  };

  // Manual scan trigger with progress tracking
  const runManualScan = async () => {
    // Fetch all active zones
    const { data: zones } = await supabase
      .from("marketing_scan_zones")
      .select("id, name")
      .eq("is_active", true);

    if (!zones || zones.length === 0) {
      toast.error("Nessuna zona attiva configurata. Aggiungi una zona prima di scansionare.");
      return;
    }

    // Open dialog and initialize progress
    setIsScanDialogOpen(true);
    setLeadFilter('all');
    setScanProgress({
      isScanning: true,
      totalZones: zones.length,
      currentZoneIndex: 0,
      currentZoneName: zones[0].name,
      totalLeadsFound: 0,
      leadsWithEmail: 0,
      leadsPhoneOnly: 0,
      osmLeadsFound: 0,
      firecrawlLeadsFound: 0,
      errors: [],
      completedZones: [],
      foundLeads: [],
      duplicatesSkipped: 0,
    });

    // Process each zone sequentially
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      
      setScanProgress(prev => ({
        ...prev,
        currentZoneIndex: i,
        currentZoneName: zone.name,
      }));

      try {
        const { data, error } = await supabase.functions.invoke("marketing-lead-finder", {
          body: { zoneId: zone.id, cityName: zone.name, searchType: "both", scanSource },
        });
        
        if (error) {
          setScanProgress(prev => ({
            ...prev,
            errors: [...prev.errors, `${zone.name}: ${error.message}`],
          }));
        } else if (data) {
          const newLeads: FoundLead[] = (data.leadsDetail || []).map((lead: any) => ({
            ...lead,
            zone: zone.name,
          }));
          
          setScanProgress(prev => ({
            ...prev,
            totalLeadsFound: prev.totalLeadsFound + (data.leadsCreated || 0),
            leadsWithEmail: prev.leadsWithEmail + (data.leadsWithEmail || 0),
            leadsPhoneOnly: prev.leadsPhoneOnly + (data.leadsPhoneOnly || 0),
            osmLeadsFound: prev.osmLeadsFound + (data.fromOsm || 0),
            firecrawlLeadsFound: prev.firecrawlLeadsFound + (data.fromSearch || 0),
            completedZones: [...prev.completedZones, zone.name],
            foundLeads: [...prev.foundLeads, ...newLeads],
            duplicatesSkipped: prev.duplicatesSkipped + (data.duplicatesSkipped || 0),
          }));
        }
      } catch (err: any) {
        setScanProgress(prev => ({
          ...prev,
          errors: [...prev.errors, `${zone.name}: ${err.message}`],
        }));
      }
    }

    // Mark scan as complete
    setScanProgress(prev => ({
      ...prev,
      isScanning: false,
      currentZoneIndex: zones.length,
    }));

    // Refresh data
    queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    queryClient.invalidateQueries({ queryKey: ["marketing-automation-logs"] });
    queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
  };

  // Close scan dialog
  const closeScanDialog = () => {
    if (!scanProgress.isScanning) {
      setIsScanDialogOpen(false);
      setLeadFilter('all');
      setScanProgress({
        isScanning: false,
        totalZones: 0,
        currentZoneIndex: 0,
        currentZoneName: "",
        totalLeadsFound: 0,
        leadsWithEmail: 0,
        leadsPhoneOnly: 0,
        osmLeadsFound: 0,
        firecrawlLeadsFound: 0,
        errors: [],
        completedZones: [],
        foundLeads: [],
        duplicatesSkipped: 0,
      });
    }
  };

  // Filter leads based on selection
  const filteredLeads = scanProgress.foundLeads.filter(lead => {
    switch (leadFilter) {
      case 'new': return lead.isNew;
      case 'email': return !!lead.email;
      case 'duplicate': return !lead.isNew;
      default: return true;
    }
  });

  // Manual email processing with detailed progress
  const processEmails = async () => {
    const pendingCount = queueStats?.pending || 0;
    
    if (pendingCount === 0) {
      toast.info("Nessuna email in coda da processare");
      return;
    }
    
    setIsProcessingEmails(true);
    setEmailProgress({
      isProcessing: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      total: pendingCount,
    });
    
    toast.loading(`Avvio invio email... (${pendingCount} in coda)`, { id: "email-processing" });
    
    try {
      const { data, error } = await supabase.functions.invoke("marketing-email-processor", {
        body: { manual: true },
      });
      
      if (error) throw error;
      
      const sent = data?.sent || 0;
      const failed = data?.failed || 0;
      const skipped = data?.skipped || 0;
      
      setEmailProgress({
        isProcessing: false,
        sent,
        failed,
        skipped,
        total: sent + failed + skipped,
      });
      
      toast.dismiss("email-processing");
      
      if (sent > 0 && failed === 0) {
        toast.success(`✅ ${sent} email inviate con successo!`, { duration: 5000 });
      } else if (sent > 0 && failed > 0) {
        toast.warning(`📧 ${sent} inviate, ${failed} fallite, ${skipped} saltate`, { duration: 5000 });
      } else if (sent === 0 && failed > 0) {
        toast.error(`❌ Tutte le ${failed} email sono fallite`, { duration: 5000 });
      } else if (sent === 0 && skipped > 0) {
        toast.info(`⏭️ ${skipped} email saltate (email invalide o disiscritti)`, { duration: 5000 });
      } else {
        toast.info("Nessuna email processata", { duration: 3000 });
      }
      
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-automation-logs"] });
    } catch (error: any) {
      toast.dismiss("email-processing");
      toast.error(`Errore nell'invio: ${error.message}`);
      setEmailProgress(prev => ({ ...prev, isProcessing: false }));
    } finally {
      setIsProcessingEmails(false);
    }
  };

  // Clean invalid emails (image files, etc)
  const cleanInvalidEmails = async () => {
    setIsCleaningEmails(true);
    toast.loading("Pulizia email invalide in corso...", { id: "cleaning-emails" });
    
    try {
      // Delete leads with image file extensions as emails
      const imageExtensions = ['.png', '.svg', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp'];
      
      let totalDeleted = 0;
      
      for (const ext of imageExtensions) {
        const { data: invalidLeads } = await supabase
          .from("marketing_leads")
          .select("id")
          .ilike("email", `%${ext}`);
        
        if (invalidLeads && invalidLeads.length > 0) {
          const leadIds = invalidLeads.map(l => l.id);
          
          // Delete queue entries for these leads first
          await supabase
            .from("marketing_email_queue")
            .delete()
            .in("lead_id", leadIds);
          
          // Delete the leads
          const { count } = await supabase
            .from("marketing_leads")
            .delete()
            .in("id", leadIds);
          
          totalDeleted += count || invalidLeads.length;
        }
      }
      
      // Also delete leads with null/empty/invalid email format
      const { data: badFormatLeads } = await supabase
        .from("marketing_leads")
        .select("id, email")
        .or("email.is.null,email.eq.");
      
      if (badFormatLeads && badFormatLeads.length > 0) {
        const leadIds = badFormatLeads.map(l => l.id);
        
        await supabase
          .from("marketing_email_queue")
          .delete()
          .in("lead_id", leadIds);
        
        const { count } = await supabase
          .from("marketing_leads")
          .delete()
          .in("id", leadIds);
        
        totalDeleted += count || badFormatLeads.length;
      }
      
      // Reset stuck processing emails
      const { count: resetCount } = await supabase
        .from("marketing_email_queue")
        .update({ 
          status: 'failed', 
          error_message: 'Reset: stuck in processing' 
        })
        .eq("status", "processing");
      
      toast.dismiss("cleaning-emails");
      toast.success(`✅ Pulizia completata: ${totalDeleted} lead invalidi rimossi${resetCount ? `, ${resetCount} email stuck resettate` : ""}`);
      
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-invalid-emails-count"] });
      
    } catch (error: any) {
      toast.dismiss("cleaning-emails");
      toast.error(`Errore pulizia: ${error.message}`);
    } finally {
      setIsCleaningEmails(false);
    }
  };

  const testSmtpConnection = async () => {
    if (!smtpForm.host || !smtpForm.user || !smtpForm.password) {
      toast.error("Compila tutti i campi SMTP prima di testare");
      return;
    }

    // Use from_email as the test recipient, or fallback to user if it's an email
    const testRecipient = smtpForm.from_email || (smtpForm.user.includes('@') ? smtpForm.user : null);
    
    if (!testRecipient) {
      toast.error("Inserisci un'email mittente valida per il test");
      return;
    }

    toast.info("Test connessione SMTP in corso...");
    
    try {
      const { data, error } = await supabase.functions.invoke("send-email-smtp", {
        body: {
          to: testRecipient,
          subject: "Test SMTP - LinkRiparo Marketing",
          html: "<h1>Test SMTP</h1><p>Se ricevi questa email, la configurazione SMTP è corretta!</p>",
          from_name_override: "LinkRiparo Test",
          smtp_config: smtpForm,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Test riuscito! Email inviata a ${testRecipient} via ${data.method}`);
      } else {
        toast.error(data?.error || "Test fallito");
      }
    } catch (error: any) {
      toast.error(`Errore test SMTP: ${error.message}`);
    }
  };

  // Test complete flow with email
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Inserisci la tua email");
      return;
    }
    if (!selectedTemplateId) {
      toast.error("Seleziona un template");
      return;
    }

    setIsSendingTest(true);
    try {
      // 1. Create a test lead
      const { data: lead, error: leadError } = await supabase
        .from("marketing_leads")
        .insert({
          business_name: testBusinessName,
          email: testEmail,
          address: "Via Test 123, Test City",
          source: "manual_test",
          status: "new",
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 2. Get first funnel stage
      const { data: firstStage } = await supabase
        .from("marketing_funnel_stages")
        .select("id")
        .eq("stage_order", 1)
        .single();

      if (firstStage) {
        await supabase
          .from("marketing_leads")
          .update({ funnel_stage_id: firstStage.id })
          .eq("id", lead.id);
      }

      // 3. Add to email queue with immediate scheduling
      const trackingId = crypto.randomUUID();
      const { error: queueError } = await supabase
        .from("marketing_email_queue")
        .insert({
          lead_id: lead.id,
          template_id: selectedTemplateId,
          scheduled_for: new Date().toISOString(),
          status: "pending",
          tracking_id: trackingId,
        });

      if (queueError) throw queueError;

      // 4. Log the test
      await supabase
        .from("marketing_automation_logs")
        .insert({
          log_type: "test",
          message: `Test flusso avviato per ${testEmail}`,
          details: { lead_id: lead.id, email: testEmail, template_id: selectedTemplateId },
          lead_id: lead.id,
        });

      toast.success(
        `Lead di test creato e email schedulata! Clicca "Processa Coda Email" per inviarla subito.`,
        { duration: 6000 }
      );

      setIsTestDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-automation-logs"] });

    } catch (error: any) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Calculate progress percentage
  const progressPercentage = scanProgress.totalZones > 0 
    ? Math.round((scanProgress.currentZoneIndex / scanProgress.totalZones) * 100) 
    : 0;

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan Progress Dialog - Nuovo layout a due colonne */}
      <Dialog open={isScanDialogOpen} onOpenChange={(open) => !scanProgress.isScanning && setIsScanDialogOpen(open)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scanProgress.isScanning ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : scanProgress.errors.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {scanProgress.isScanning ? "Scansione in corso..." : "Scansione completata"}
            </DialogTitle>
            <DialogDescription>
              {scanProgress.isScanning 
                ? `Ricerca lead in ${scanProgress.totalZones} zone. Leads trovati in tempo reale.`
                : `Completata su ${scanProgress.totalZones} zone - ${scanProgress.foundLeads.length} lead trovati.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-h-[60vh] overflow-hidden">
            {/* Colonna sinistra - Progress & Stats (2/5) */}
            <div className="md:col-span-2 space-y-4 overflow-y-auto pr-2">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">
                    {scanProgress.isScanning 
                      ? `${scanProgress.currentZoneIndex + 1} / ${scanProgress.totalZones}`
                      : `${scanProgress.totalZones} / ${scanProgress.totalZones}`
                    }
                  </span>
                </div>
                <Progress 
                  value={scanProgress.isScanning ? progressPercentage : 100} 
                  className="h-3"
                />
              </div>

              {/* Current Zone */}
              {scanProgress.isScanning && scanProgress.currentZoneName && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <MapPin className="h-5 w-5 text-primary animate-pulse" />
                  <div>
                    <p className="font-medium text-sm">Scansione zona:</p>
                    <p className="text-primary font-semibold">{scanProgress.currentZoneName}</p>
                  </div>
                </div>
              )}

              {/* Stats compatti */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600">{scanProgress.totalLeadsFound}</p>
                  <p className="text-xs text-muted-foreground">Nuovi lead</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-center">
                  <p className="text-xl font-bold text-primary">{scanProgress.leadsWithEmail}</p>
                  <p className="text-xs text-muted-foreground">Con email</p>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-600">{scanProgress.leadsPhoneOnly}</p>
                  <p className="text-xs text-muted-foreground">Solo tel.</p>
                </div>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                  <p className="text-xl font-bold text-muted-foreground">{scanProgress.duplicatesSkipped}</p>
                  <p className="text-xs text-muted-foreground">Duplicati</p>
                </div>
              </div>
              
              {/* Source stats */}
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <MapPin className="h-3 w-3 mr-1" />
                  OSM: {scanProgress.osmLeadsFound}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Web: {scanProgress.firecrawlLeadsFound}
                </Badge>
              </div>

              {/* Completed Zones */}
              {scanProgress.completedZones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Zone completate:</p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {scanProgress.completedZones.map((zone, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-2.5 w-2.5 mr-1" />
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {scanProgress.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-destructive">Errori ({scanProgress.errors.length}):</p>
                  <div className="max-h-16 overflow-y-auto space-y-1">
                    {scanProgress.errors.map((error, i) => (
                      <div key={i} className="flex items-start gap-1 text-xs text-destructive bg-destructive/5 p-1 rounded">
                        <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Colonna destra - Lista Lead Real-time (3/5) */}
            <div className="md:col-span-3 flex flex-col border-l pl-4">
              {/* Filtri */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Filtro:</span>
                <Button 
                  size="sm" 
                  variant={leadFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setLeadFilter('all')}
                  className="h-6 text-xs px-2"
                >
                  Tutti ({scanProgress.foundLeads.length})
                </Button>
                <Button 
                  size="sm" 
                  variant={leadFilter === 'new' ? 'default' : 'outline'}
                  onClick={() => setLeadFilter('new')}
                  className="h-6 text-xs px-2"
                >
                  Nuovi ({scanProgress.foundLeads.filter(l => l.isNew).length})
                </Button>
                <Button 
                  size="sm" 
                  variant={leadFilter === 'email' ? 'default' : 'outline'}
                  onClick={() => setLeadFilter('email')}
                  className="h-6 text-xs px-2"
                >
                  Con email ({scanProgress.foundLeads.filter(l => l.email).length})
                </Button>
                <Button 
                  size="sm" 
                  variant={leadFilter === 'duplicate' ? 'default' : 'outline'}
                  onClick={() => setLeadFilter('duplicate')}
                  className="h-6 text-xs px-2"
                >
                  Duplicati ({scanProgress.foundLeads.filter(l => !l.isNew).length})
                </Button>
              </div>
              
              {/* Lista lead scrollabile */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[45vh] pr-2">
                {filteredLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                    {scanProgress.isScanning ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p className="text-sm">Ricerca lead in corso...</p>
                      </>
                    ) : (
                      <>
                        <Users className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">Nessun lead trovato</p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredLeads.map((lead, idx) => (
                    <div 
                      key={`${lead.name}-${idx}`}
                      className={`p-3 rounded-lg border transition-all ${
                        lead.isNew 
                          ? lead.email 
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{lead.name}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                lead.isNew 
                                  ? lead.email 
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-blue-100 text-blue-700 border-blue-300'
                                  : 'bg-gray-100 text-gray-600 border-gray-300'
                              }`}
                            >
                              {lead.isNew ? (lead.email ? '✓ NUOVO + EMAIL' : '+ NUOVO') : 'DUPLICATO'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {lead.email && (
                              <span className="flex items-center gap-1 text-green-600">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <Badge variant="secondary" className="text-xs h-5">
                              {lead.businessType === 'centro' ? '🔧 Centro' : '🏪 Corner'}
                            </Badge>
                            <Badge variant="outline" className="text-xs h-5">
                              {lead.source === 'osm' ? '📍 OSM' : '🔍 Web'}
                            </Badge>
                            {lead.zone && (
                              <span className="text-muted-foreground">{lead.zone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              onClick={closeScanDialog} 
              disabled={scanProgress.isScanning}
              variant={scanProgress.isScanning ? "outline" : "default"}
            >
              {scanProgress.isScanning ? "Scansione in corso..." : "Chiudi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Master Control */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Automazione Marketing</CardTitle>
                <CardDescription>Controllo globale del sistema automatizzato</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="automation-enabled" className="text-sm font-medium">
                {settings?.is_enabled ? "Attivo" : "Disattivato"}
              </Label>
              <Switch
                id="automation-enabled"
                checked={settings?.is_enabled || false}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ is_enabled: checked })
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className={`h-3 w-3 rounded-full ${settings?.auto_scan_enabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              <div>
                <p className="font-medium">Auto-Scan Zone</p>
                <p className="text-sm text-muted-foreground">Ogni 6 ore</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className={`h-3 w-3 rounded-full ${settings?.auto_email_enabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              <div>
                <p className="font-medium">Auto-Email SMTP</p>
                <p className="text-sm text-muted-foreground">Ogni 1 ora</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className={`h-3 w-3 rounded-full ${settings?.auto_funnel_enabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              <div>
                <p className="font-medium">Auto-Funnel</p>
                <p className="text-sm text-muted-foreground">Giornaliero</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <div>
                <p className="font-medium">Disiscritti</p>
                <p className="text-sm text-muted-foreground">{unsubStats?.count || 0} email</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="actions">Azioni Rapide</TabsTrigger>
          <TabsTrigger value="smtp">Configurazione SMTP</TabsTrigger>
          <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          <TabsTrigger value="logs">Log Attività</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-4">
          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Scansione Manuale
                </CardTitle>
                <CardDescription>Avvia una scansione di tutte le zone attive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Source Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fonte dati</Label>
                  <Select value={scanSource} onValueChange={(v) => setScanSource(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">
                        <div className="flex items-center gap-2">
                          <span>🔄</span>
                          <span>Entrambi (OSM + Firecrawl)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="osm">
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>Solo OpenStreetMap (GRATIS)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="firecrawl">
                        <div className="flex items-center gap-2">
                          <span>🔍</span>
                          <span>Solo Firecrawl (a pagamento)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {scanSource === "osm" && "OpenStreetMap è gratuito ma ha meno negozi con email"}
                    {scanSource === "firecrawl" && "Firecrawl cerca sul web ma consuma crediti API"}
                    {scanSource === "both" && "Prima cerca su OSM, poi integra con Firecrawl se necessario"}
                  </p>
                </div>
                
                <Button 
                  onClick={runManualScan} 
                  disabled={scanProgress.isScanning}
                  className="w-full"
                >
                  {scanProgress.isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scansione in corso...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Avvia Scansione
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Processa Coda Email
                </CardTitle>
                <CardDescription>
                  {queueStats?.pending || 0} in coda, {queueStats?.sent || 0} inviate, {queueStats?.failed || 0} fallite
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress indicator during processing */}
                {emailProgress.isProcessing && (
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Elaborazione in corso...</span>
                      </span>
                      <span className="text-muted-foreground">
                        {emailProgress.sent + emailProgress.failed + emailProgress.skipped}/{emailProgress.total}
                      </span>
                    </div>
                    <Progress 
                      value={emailProgress.total > 0 
                        ? ((emailProgress.sent + emailProgress.failed + emailProgress.skipped) / emailProgress.total) * 100 
                        : 0
                      } 
                      className="h-2"
                    />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {emailProgress.sent} inviate
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        {emailProgress.failed} fallite
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        {emailProgress.skipped} saltate
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Last processing result (after completion) */}
                {!emailProgress.isProcessing && emailProgress.total > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg border">
                    <div className="text-sm font-medium mb-2">Ultimo invio completato:</div>
                    <div className="flex gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {emailProgress.sent} inviate
                      </span>
                      {emailProgress.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {emailProgress.failed} fallite
                        </span>
                      )}
                      {emailProgress.skipped > 0 && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          {emailProgress.skipped} saltate
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={processEmails} 
                  disabled={isProcessingEmails || (queueStats?.pending || 0) === 0}
                  className="w-full"
                  variant={(queueStats?.pending || 0) > 0 ? "default" : "outline"}
                >
                  {isProcessingEmails ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (queueStats?.pending || 0) === 0 ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Nessuna email da inviare
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Invia {queueStats?.pending} Email
                    </>
                  )}
                </Button>
                
                {/* Invalid emails alert & cleanup */}
                {(invalidEmailsCount > 0 || (queueStats?.processing || 0) > 0) && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Problemi rilevati
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {invalidEmailsCount > 0 && (
                        <p>• {invalidEmailsCount} lead con email invalide (file immagine)</p>
                      )}
                      {(queueStats?.processing || 0) > 0 && (
                        <p>• {queueStats?.processing} email bloccate in elaborazione</p>
                      )}
                    </div>
                    <Button 
                      onClick={cleanInvalidEmails} 
                      disabled={isCleaningEmails}
                      variant="destructive"
                      size="sm"
                      className="w-full mt-2"
                    >
                      {isCleaningEmails ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Pulizia in corso...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Pulisci Email Invalide
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Test Flow Card */}
            <Card className="md:col-span-2 border-2 border-dashed border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  Test Flusso Completo
                </CardTitle>
                <CardDescription>
                  Testa il flusso email marketing completo con la tua email: invio → apertura → click → registrazione
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="default">
                      <FlaskConical className="h-4 w-4 mr-2" />
                      Avvia Test con la Mia Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-primary" />
                        Test Flusso Marketing
                      </DialogTitle>
                      <DialogDescription>
                        Inserisci la tua email per testare l'intero flusso: riceverai un'email con tracking, quando clicchi sul CTA verrai reindirizzato alla registrazione con i parametri corretti.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>La tua Email</Label>
                        <Input
                          type="email"
                          placeholder="tuaemail@esempio.it"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome Azienda Test</Label>
                        <Input
                          placeholder="Test Riparazioni Srl"
                          value={testBusinessName}
                          onChange={(e) => setTestBusinessName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Template Email</Label>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} ({t.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                        <p className="font-medium">Cosa succederà:</p>
                        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                          <li>Verrà creato un lead di test con la tua email</li>
                          <li>L'email verrà schedulata nella coda</li>
                          <li>Clicca "Processa Coda Email" per inviarla</li>
                          <li>Apri l'email → lo stato diventa "Interested"</li>
                          <li>Clicca il CTA → redirect a /auth con parametri</li>
                          <li>Registrati → lead diventa "Converted"</li>
                        </ol>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button onClick={sendTestEmail} disabled={isSendingTest}>
                        {isSendingTest ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creazione...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Crea Lead e Schedula Email
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="smtp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                Configurazione SMTP Marketing
              </CardTitle>
              <CardDescription>
                Configura il server SMTP per l'invio delle email marketing. Questo evita di finire nello spam.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Host SMTP</Label>
                  <Input
                    placeholder="smtp.tuodominio.it"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input
                    type="number"
                    placeholder="587"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Username SMTP</Label>
                  <Input
                    placeholder="noreply@tuodominio.it"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password SMTP</Label>
                  <div className="relative">
                    <Input
                      type={showSmtpPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Mittente</Label>
                <Input
                  type="email"
                  placeholder="marketing@tuodominio.it"
                  value={smtpForm.from_email}
                  onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Questa email apparirà come mittente nelle comunicazioni marketing
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={smtpForm.secure}
                  onCheckedChange={(checked) => setSmtpForm({ ...smtpForm, secure: checked })}
                />
                <Label>Usa TLS/SSL (porta 465)</Label>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome Mittente</Label>
                  <Input
                    placeholder="Riccardo C. - LinkRiparo"
                    value={settings?.marketing_sender_name || ""}
                    onChange={(e) => updateSettingsMutation.mutate({ marketing_sender_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Indirizzo Fisico (Anti-Spam)</Label>
                  <Input
                    placeholder="Via Example 123, 00100 Roma"
                    value={settings?.physical_address || ""}
                    onChange={(e) => updateSettingsMutation.mutate({ physical_address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveSmtpConfig} disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Salva Configurazione
                </Button>
                <Button variant="outline" onClick={testSmtpConnection}>
                  <Shield className="h-4 w-4 mr-2" />
                  Testa Connessione
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Settings Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impostazioni Scansione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-scan abilitato</Label>
                  <Switch
                    checked={settings?.auto_scan_enabled || false}
                    onCheckedChange={(checked) => 
                      updateSettingsMutation.mutate({ auto_scan_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impostazioni Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Auto-email abilitato</Label>
                  <Switch
                    checked={settings?.auto_email_enabled || false}
                    onCheckedChange={(checked) => 
                      updateSettingsMutation.mutate({ auto_email_enabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto-funnel abilitato</Label>
                  <Switch
                    checked={settings?.auto_funnel_enabled || false}
                    onCheckedChange={(checked) => 
                      updateSettingsMutation.mutate({ auto_funnel_enabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* Recent Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Attività Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna attività recente
                  </p>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      {log.log_type === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      ) : log.log_type === 'conversion' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : log.log_type === 'unsubscribe' ? (
                        <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={log.log_type === 'error' ? 'destructive' : log.log_type === 'conversion' ? 'default' : 'outline'} 
                            className="text-xs"
                          >
                            {log.log_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{log.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
