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
  MapPin, Users, XCircle
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

interface ScanProgress {
  isScanning: boolean;
  totalZones: number;
  currentZoneIndex: number;
  currentZoneName: string;
  totalLeadsFound: number;
  totalResultsFound: number;
  errors: string[];
  completedZones: string[];
}

export function AutomationTab() {
  const queryClient = useQueryClient();
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
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

  // Scan progress state
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    totalZones: 0,
    currentZoneIndex: 0,
    currentZoneName: "",
    totalLeadsFound: 0,
    totalResultsFound: 0,
    errors: [],
    completedZones: [],
  });
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);

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
      };
    },
    refetchInterval: 10000,
  });

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
    setScanProgress({
      isScanning: true,
      totalZones: zones.length,
      currentZoneIndex: 0,
      currentZoneName: zones[0].name,
      totalLeadsFound: 0,
      totalResultsFound: 0,
      errors: [],
      completedZones: [],
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
          body: { zoneId: zone.id, cityName: zone.name, searchType: "both" },
        });
        
        if (error) {
          setScanProgress(prev => ({
            ...prev,
            errors: [...prev.errors, `${zone.name}: ${error.message}`],
          }));
        } else if (data) {
          setScanProgress(prev => ({
            ...prev,
            totalLeadsFound: prev.totalLeadsFound + (data.leadsCreated || 0),
            totalResultsFound: prev.totalResultsFound + (data.resultsFound || 0),
            completedZones: [...prev.completedZones, zone.name],
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
      setScanProgress({
        isScanning: false,
        totalZones: 0,
        currentZoneIndex: 0,
        currentZoneName: "",
        totalLeadsFound: 0,
        totalResultsFound: 0,
        errors: [],
        completedZones: [],
      });
    }
  };

  // Manual email processing
  const processEmails = async () => {
    setIsProcessingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-email-processor", {
        body: { manual: true },
      });
      if (error) throw error;
      toast.success(`Email processate: ${data.sent || 0} inviate, ${data.failed || 0} fallite`);
      queryClient.invalidateQueries({ queryKey: ["marketing-email-queue-stats"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-automation-logs"] });
    } catch (error: any) {
      toast.error(`Errore nell'invio: ${error.message}`);
    } finally {
      setIsProcessingEmails(false);
    }
  };

  // Test SMTP connection
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
      {/* Scan Progress Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={(open) => !scanProgress.isScanning && setIsScanDialogOpen(open)}>
        <DialogContent className="sm:max-w-lg">
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
                ? "Ricerca lead in tutte le zone attive. Questo può richiedere diversi minuti."
                : `Scansione completata su ${scanProgress.totalZones} zone.`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{scanProgress.totalLeadsFound}</p>
                <p className="text-xs text-muted-foreground">Lead trovati</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <RefreshCw className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{scanProgress.totalResultsFound}</p>
                <p className="text-xs text-muted-foreground">Siti analizzati</p>
              </div>
            </div>

            {/* Completed Zones */}
            {scanProgress.completedZones.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Zone completate:</p>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {scanProgress.completedZones.map((zone, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {zone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {scanProgress.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Errori ({scanProgress.errors.length}):</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {scanProgress.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 p-2 rounded">
                      <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
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
                <CardDescription>Avvia una scansione approfondita di tutte le zone attive con progress bar</CardDescription>
              </CardHeader>
              <CardContent>
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
                      Avvia Scansione Completa
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
              <CardContent>
                <Button 
                  onClick={processEmails} 
                  disabled={isProcessingEmails || (queueStats?.pending || 0) === 0}
                  className="w-full"
                  variant="outline"
                >
                  {isProcessingEmails ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Invia Email ({queueStats?.pending || 0})
                    </>
                  )}
                </Button>
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
