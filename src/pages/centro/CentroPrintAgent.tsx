import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { generateRepairLabel, generateDeviceLabel, generateShelfLabel } from '@/utils/labelTemplates';
import { 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Wifi,
  WifiOff,
  Clock,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PrintJob {
  id: string;
  label_type: string;
  label_data: any;
  label_xml: string | null;
  status: string;
  copies: number;
  priority: number;
  error_message: string | null;
  created_at: string;
  printed_at: string | null;
}

export default function CentroPrintAgent() {
  const { user } = useAuth();
  const {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    environment,
    isLoading: isDymoLoading,
    checkEnvironment,
    refreshPrinters,
    printLabel,
  } = useDymoPrinter();

  const [centroId, setCentroId] = useState<string | null>(null);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintJob[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Fetch Centro ID
  useEffect(() => {
    const fetchCentroId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('centri_assistenza')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();
      
      if (data) {
        setCentroId(data.id);
      }
    };
    
    fetchCentroId();
  }, [user]);

  // Fetch print queue
  const fetchQueue = useCallback(async () => {
    if (!centroId) return;
    
    const { data: pending } = await supabase
      .from('print_queue')
      .select('*')
      .eq('centro_id', centroId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    
    const { data: history } = await supabase
      .from('print_queue')
      .select('*')
      .eq('centro_id', centroId)
      .in('status', ['completed', 'failed'])
      .order('printed_at', { ascending: false })
      .limit(20);
    
    if (pending) setPrintQueue(pending);
    if (history) setPrintHistory(history);
    setLastCheck(new Date());
  }, [centroId]);

  // Initial fetch
  useEffect(() => {
    if (centroId) {
      fetchQueue();
    }
  }, [centroId, fetchQueue]);

  // Real-time subscription
  useEffect(() => {
    if (!centroId) return;

    const channel = supabase
      .channel('print-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_queue',
          filter: `centro_id=eq.${centroId}`
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [centroId, fetchQueue]);

  // Generate label XML from job data
  const generateLabelXml = (job: PrintJob): string => {
    if (job.label_xml) return job.label_xml;
    
    switch (job.label_type) {
      case 'repair':
        return generateRepairLabel(job.label_data);
      case 'device':
        return generateDeviceLabel(job.label_data);
      case 'shelf':
        return generateShelfLabel(job.label_data);
      default:
        throw new Error(`Unknown label type: ${job.label_type}`);
    }
  };

  // Process a single print job
  const processJob = async (job: PrintJob): Promise<boolean> => {
    try {
      // Update status to printing
      await supabase
        .from('print_queue')
        .update({ status: 'printing' })
        .eq('id', job.id);

      // Generate label XML
      const labelXml = generateLabelXml(job);

      // Print
      const success = await printLabel(labelXml, job.copies);

      if (success) {
        await supabase
          .from('print_queue')
          .update({ 
            status: 'completed', 
            printed_at: new Date().toISOString(),
            printer_name: selectedPrinter
          })
          .eq('id', job.id);
        return true;
      } else {
        throw new Error('Stampa fallita');
      }
    } catch (error: any) {
      await supabase
        .from('print_queue')
        .update({ 
          status: 'failed', 
          error_message: error.message || 'Errore sconosciuto'
        })
        .eq('id', job.id);
      return false;
    }
  };

  // Process queue
  const processQueue = useCallback(async () => {
    if (!isAgentActive || !selectedPrinter || isPrinting || printQueue.length === 0) return;

    setIsPrinting(true);

    for (const job of printQueue) {
      if (!isAgentActive) break;
      await processJob(job);
      await fetchQueue();
    }

    setIsPrinting(false);
  }, [isAgentActive, selectedPrinter, isPrinting, printQueue, fetchQueue]);

  // Auto-process when queue changes and agent is active
  useEffect(() => {
    if (isAgentActive && printQueue.length > 0 && !isPrinting && selectedPrinter) {
      processQueue();
    }
  }, [isAgentActive, printQueue, isPrinting, selectedPrinter, processQueue]);

  // Polling interval when agent is active
  useEffect(() => {
    if (!isAgentActive || !centroId) return;

    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAgentActive, centroId, fetchQueue]);

  const handleToggleAgent = () => {
    if (!environment?.isServiceRunning) {
      toast.error('Dymo Connect non disponibile');
      return;
    }
    if (!selectedPrinter) {
      toast.error('Seleziona prima una stampante');
      return;
    }
    setIsAgentActive(!isAgentActive);
    if (!isAgentActive) {
      toast.success('Print Agent attivato');
    }
  };

  const handleRetryJob = async (job: PrintJob) => {
    await supabase
      .from('print_queue')
      .update({ status: 'pending', error_message: null })
      .eq('id', job.id);
    fetchQueue();
  };

  const handleDeleteJob = async (jobId: string) => {
    await supabase
      .from('print_queue')
      .delete()
      .eq('id', jobId);
    fetchQueue();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Printer className="h-6 w-6 text-primary" />
          Print Agent
        </h1>
        <p className="text-muted-foreground mt-1">
          Questo agent stampa automaticamente le etichette dalla coda di stampa remota
        </p>
      </div>

      {/* Info Alert when Dymo not connected */}
      {!environment?.isServiceRunning && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Dymo Connect non rilevato dal browser.</strong> Per motivi di sicurezza del browser (HTTPS/CORS), questa pagina web non può connettersi direttamente a Dymo Connect.
            <br /><br />
            <strong>Soluzione: Usa il Print Agent Standalone</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>
                <a 
                  href="/print-agent-standalone.html" 
                  target="_blank" 
                  className="text-primary underline font-medium hover:text-primary/80"
                >
                  Clicca qui per aprire il Print Agent Standalone
                </a>
              </li>
              <li>Salva la pagina sul desktop del PC con la stampante (Ctrl+S)</li>
              <li>Apri il file HTML salvato localmente</li>
              <li>Inserisci il tuo Centro ID: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs">{centroId}</code></li>
              <li>Clicca "Avvia" - il file locale può connettersi a Dymo senza restrizioni</li>
            </ol>
            <br />
            <strong>Intanto puoi vedere la coda di stampa qui sotto.</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stato Agent</span>
            <Badge variant={isAgentActive ? 'default' : 'secondary'} className="gap-1">
              {isAgentActive ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Attivo
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Inattivo
                </>
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            Mantieni questa pagina aperta sul PC con la stampante Dymo collegata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dymo Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {environment?.isServiceRunning ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">Dymo Connect</p>
                <p className="text-sm text-muted-foreground">
                  {environment?.isServiceRunning ? 'Connesso' : 'Non rilevato su questo PC'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkEnvironment();
                refreshPrinters();
              }}
              disabled={isDymoLoading}
            >
              {isDymoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Printer Selection */}
          {environment?.isServiceRunning && (
            <div className="space-y-2">
              <Label>Stampante</Label>
              <Select
                value={selectedPrinter || ''}
                onValueChange={setSelectedPrinter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stampante..." />
                </SelectTrigger>
                <SelectContent>
                  {printers.map((printer) => (
                    <SelectItem key={printer.name} value={printer.name}>
                      {printer.name} ({printer.modelName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Agent Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label htmlFor="agent-toggle" className="text-base font-medium">
                Attiva Print Agent
              </Label>
              <p className="text-sm text-muted-foreground">
                Stampa automaticamente i lavori in coda
              </p>
            </div>
            <Button
              variant={isAgentActive ? 'destructive' : 'default'}
              onClick={handleToggleAgent}
              disabled={!environment?.isServiceRunning || !selectedPrinter}
              className="gap-2"
            >
              {isAgentActive ? (
                <>
                  <Pause className="h-4 w-4" />
                  Ferma
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Avvia
                </>
              )}
            </Button>
          </div>

          {lastCheck && (
            <p className="text-xs text-muted-foreground text-right">
              Ultimo controllo: {format(lastCheck, 'HH:mm:ss', { locale: it })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Queue Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Coda di Stampa
            </span>
            <Badge variant="outline">{printQueue.length} in attesa</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {printQueue.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun lavoro in coda
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {printQueue.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">
                          {job.label_type === 'repair' ? 'Etichetta Riparazione' : 
                           job.label_type === 'device' ? 'Etichetta Dispositivo' : 
                           'Etichetta Scaffale'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(job.created_at), 'dd/MM HH:mm', { locale: it })}
                          {job.copies > 1 && ` • ${job.copies} copie`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'printing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Cronologia Stampe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {printHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nessuna stampa recente
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {printHistory.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {job.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {job.label_type === 'repair' ? 'Etichetta Riparazione' : 
                           job.label_type === 'device' ? 'Etichetta Dispositivo' : 
                           'Etichetta Scaffale'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.printed_at && format(new Date(job.printed_at), 'dd/MM HH:mm', { locale: it })}
                          {job.error_message && (
                            <span className="text-destructive"> • {job.error_message}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryJob(job)}
                      >
                        Riprova
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">Come funziona:</p>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>Apri questa pagina sul PC dove è collegata la stampante Dymo</li>
            <li>Seleziona la stampante e clicca "Avvia"</li>
            <li>Mantieni la pagina aperta - stamperà automaticamente i lavori in coda</li>
            <li>Da qualsiasi altro dispositivo puoi inviare etichette alla coda</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}
