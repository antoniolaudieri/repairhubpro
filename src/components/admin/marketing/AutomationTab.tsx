import { useState } from "react";
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
import { 
  Play, Pause, Settings, Zap, Clock, Mail, 
  RefreshCw, AlertCircle, CheckCircle, Loader2,
  Server, Shield, Eye, EyeOff
} from "lucide-react";
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

export function AutomationTab() {
  const queryClient = useQueryClient();
  const [isRunningManualScan, setIsRunningManualScan] = useState(false);
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from_email: "",
  });

  // Fetch automation settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["marketing-automation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_automation_settings")
        .select("*")
        .single();
      if (error) throw error;
      
      // Initialize SMTP form with saved config
      if (data?.smtp_config) {
        const config = data.smtp_config as unknown as SmtpConfig;
        setSmtpForm({
          host: config.host || "",
          port: config.port || 587,
          secure: config.secure || false,
          user: config.user || "",
          password: config.password || "",
          from_email: config.from_email || "",
        });
      }
      
      return data;
    },
  });

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

  // Manual scan trigger
  const runManualScan = async () => {
    setIsRunningManualScan(true);
    try {
      const { data: zones } = await supabase
        .from("marketing_scan_zones")
        .select("id, name")
        .eq("is_active", true);

      if (!zones || zones.length === 0) {
        toast.error("Nessuna zona attiva configurata. Aggiungi una zona prima di scansionare.");
        setIsRunningManualScan(false);
        return;
      }

      let totalLeads = 0;
      let totalResults = 0;

      for (const zone of zones) {
        toast.info(`Scansione "${zone.name}" in corso...`);
        
        const { data, error } = await supabase.functions.invoke("marketing-lead-finder", {
          body: { zoneId: zone.id, cityName: zone.name, searchType: "both" },
        });
        
        if (!error && data) {
          totalLeads += data.leadsCreated || 0;
          totalResults += data.resultsFound || 0;
        }
      }

      toast.success(`Scansione completata: ${totalLeads} nuovi lead su ${totalResults} risultati`);
      queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-automation-logs"] });
      queryClient.invalidateQueries({ queryKey: ["marketing-scan-zones"] });
    } catch (error: any) {
      toast.error(`Errore nella scansione: ${error.message}`);
    } finally {
      setIsRunningManualScan(false);
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

    toast.info("Test connessione SMTP in corso...");
    
    try {
      const { data, error } = await supabase.functions.invoke("send-email-smtp", {
        body: {
          to: smtpForm.user,
          subject: "Test SMTP - LinkRiparo Marketing",
          html: "<h1>Test SMTP</h1><p>Se ricevi questa email, la configurazione SMTP è corretta!</p>",
          from_name_override: "LinkRiparo Test",
          smtp_config: smtpForm,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Test riuscito! Email inviata via ${data.method}`);
      } else {
        toast.error(data?.error || "Test fallito");
      }
    } catch (error: any) {
      toast.error(`Errore test SMTP: ${error.message}`);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                <CardDescription>Avvia una scansione immediata di tutte le zone attive</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={runManualScan} 
                  disabled={isRunningManualScan}
                  className="w-full"
                >
                  {isRunningManualScan ? (
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
