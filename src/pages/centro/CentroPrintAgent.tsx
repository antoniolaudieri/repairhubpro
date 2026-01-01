import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CentroLayout } from '@/layouts/CentroLayout';
import { 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
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

  const [centroId, setCentroId] = useState<string | null>(null);
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

  // Initial fetch and polling
  useEffect(() => {
    if (centroId) {
      fetchQueue();
      const interval = setInterval(fetchQueue, 10000);
      return () => clearInterval(interval);
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

  const handleDeleteJob = async (jobId: string) => {
    await supabase
      .from('print_queue')
      .delete()
      .eq('id', jobId);
    fetchQueue();
  };

  return (
    <CentroLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Printer className="h-6 w-6 text-primary" />
          Print Agent - Coda di Stampa
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualizza la coda di stampa. Per stampare, usa il Print Agent Standalone sul PC con la stampante.
        </p>
      </div>

      {/* Instructions Alert */}
      <Alert className="mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
        <Printer className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-800 dark:text-emerald-200">
          <strong>Come stampare le etichette:</strong>
          <p className="mt-2">
            I browser web non possono connettersi direttamente a Dymo Connect per motivi di sicurezza. 
            Devi usare il <strong>Print Agent Standalone</strong> sul PC con la stampante.
          </p>
          <div className="mt-3 p-3 bg-white dark:bg-emerald-900/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <a 
                  href="/print-agent-standalone.html" 
                  target="_blank" 
                  className="text-primary underline font-bold hover:text-primary/80"
                >
                  Scarica il Print Agent Standalone
                </a>
                {' '} (clicca col tasto destro → "Salva con nome")
              </li>
              <li>Apri il file HTML salvato sul PC con la stampante Dymo</li>
              <li>
                Inserisci il Centro ID: <code className="bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded font-mono text-sm">{centroId}</code>
              </li>
              <li>Clicca <strong>"Avvia"</strong> - il file locale può connettersi a Dymo senza restrizioni</li>
            </ol>
          </div>
          <p className="mt-3 text-sm">
            ✅ <strong>Lo hai già fatto?</strong> Perfetto! Il file standalone stamperà automaticamente i lavori in coda.
          </p>
        </AlertDescription>
      </Alert>

      {/* Queue Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Coda di Stampa
            </span>
            <div className="flex items-center gap-2">
              <Badge variant={printQueue.length > 0 ? 'default' : 'outline'}>
                {printQueue.length} in attesa
              </Badge>
              <Button variant="ghost" size="sm" onClick={fetchQueue}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            I lavori in coda verranno stampati automaticamente dal Print Agent Standalone
          </CardDescription>
        </CardHeader>
        <CardContent>
          {printQueue.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun lavoro in coda
            </p>
          ) : (
            <ScrollArea className="h-[250px]">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          {lastCheck && (
            <p className="text-xs text-muted-foreground text-right mt-4">
              Ultimo aggiornamento: {format(lastCheck, 'HH:mm:ss', { locale: it })}
            </p>
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
                          {job.error_message && ` • ${job.error_message}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
        </Card>
      </div>
    </CentroLayout>
  );
}
