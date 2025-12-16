import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Send, Download, CheckCircle, Shield, Bug, UserX, Database } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateForensicReportPDF } from '@/components/centro/ForensicReportPDFGenerator';

interface ForensicReport {
  id: string;
  centro_id: string;
  report_number: string;
  report_date: string;
  purpose: string;
  recipient_name: string | null;
  recipient_role: string | null;
  device_type: string;
  device_brand: string | null;
  device_model: string | null;
  device_serial: string | null;
  device_imei: string | null;
  device_condition: string | null;
  analysis_summary: string;
  malware_check: boolean;
  malware_findings: string | null;
  spyware_check: boolean;
  spyware_findings: string | null;
  compromised_accounts_check: boolean;
  compromised_accounts_findings: string | null;
  data_integrity_check: boolean;
  data_integrity_findings: string | null;
  other_findings: string | null;
  conclusions: string;
  recommendations: string | null;
  technician_name: string;
  technician_qualification: string | null;
  status: string;
  sent_at: string | null;
  sent_to_email: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
  };
}

interface Centro {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_number: string | null;
  logo_url: string | null;
}

const purposeLabels: Record<string, string> = {
  avvocato: 'Avvocato',
  polizia_postale: 'Polizia Postale',
  assicurazione: 'Assicurazione',
  altro: 'Altro'
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Bozza', variant: 'secondary' },
  finalized: { label: 'Finalizzata', variant: 'default' },
  sent: { label: 'Inviata', variant: 'outline' }
};

export default function CentroPeriziaDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [centro, setCentro] = useState<Centro | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  const loadData = async () => {
    try {
      // Load centro
      const { data: centroData } = await supabase
        .from('centri_assistenza')
        .select('id, business_name, address, phone, email, vat_number, logo_url')
        .eq('owner_user_id', user!.id)
        .single();

      if (centroData) {
        setCentro(centroData);
      }

      // Load report
      const { data, error } = await supabase
        .from('forensic_reports')
        .select(`
          *,
          customer:customers(id, name, email, phone, address)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report || !centro) return;
    
    try {
      await generateForensicReportPDF(report, centro);
      toast.success('PDF scaricato');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Errore nella generazione del PDF');
    }
  };

  const handleFinalize = async () => {
    if (!report) return;

    const { error } = await supabase
      .from('forensic_reports')
      .update({ status: 'finalized' })
      .eq('id', report.id);

    if (error) {
      toast.error('Errore nella finalizzazione');
    } else {
      toast.success('Perizia finalizzata');
      loadData();
    }
  };

  const handleSendEmail = async () => {
    if (!report || !centro || !report.customer.email) {
      toast.error('Email cliente non disponibile');
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-forensic-report-email', {
        body: {
          reportId: report.id,
          centroId: centro.id,
          customerEmail: report.customer.email,
          customerName: report.customer.name
        }
      });

      if (error) throw error;

      // Update status
      await supabase
        .from('forensic_reports')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_to_email: report.customer.email
        })
        .eq('id', report.id);

      toast.success('Perizia inviata via email');
      loadData();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Errore nell\'invio email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Perizia non trovata</p>
        <Button variant="link" onClick={() => navigate('/centro/perizie')}>
          Torna alle perizie
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/centro/perizie')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{report.report_number}</h1>
            <Badge variant={statusConfig[report.status]?.variant || 'secondary'}>
              {statusConfig[report.status]?.label || report.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {format(new Date(report.report_date), 'd MMMM yyyy', { locale: it })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Scarica PDF
          </Button>
          {report.status === 'draft' && (
            <Button variant="outline" onClick={handleFinalize}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizza
            </Button>
          )}
          {report.status !== 'draft' && report.customer.email && (
            <Button onClick={handleSendEmail} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Invio...' : 'Invia Email'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dispositivo Analizzato
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium capitalize">{report.device_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marca/Modello</p>
                <p className="font-medium">{report.device_brand} {report.device_model}</p>
              </div>
              {report.device_serial && (
                <div>
                  <p className="text-sm text-muted-foreground">Seriale</p>
                  <p className="font-medium font-mono">{report.device_serial}</p>
                </div>
              )}
              {report.device_imei && (
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-medium font-mono">{report.device_imei}</p>
                </div>
              )}
              {report.device_condition && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Condizione</p>
                  <p className="font-medium">{report.device_condition}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Sommario Analisi</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{report.analysis_summary}</p>
            </CardContent>
          </Card>

          {/* Findings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.malware_check && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bug className="h-4 w-4 text-destructive" />
                    Verifica Malware
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {report.malware_findings || 'Nessun malware rilevato'}
                  </p>
                </CardContent>
              </Card>
            )}

            {report.spyware_check && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    Verifica Spyware
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {report.spyware_findings || 'Nessun spyware rilevato'}
                  </p>
                </CardContent>
              </Card>
            )}

            {report.compromised_accounts_check && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserX className="h-4 w-4 text-yellow-500" />
                    Account Compromessi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {report.compromised_accounts_findings || 'Nessun account compromesso'}
                  </p>
                </CardContent>
              </Card>
            )}

            {report.data_integrity_check && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    Integrità Dati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">
                    {report.data_integrity_findings || 'Dati integri'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {report.other_findings && (
            <Card>
              <CardHeader>
                <CardTitle>Altri Risultati</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{report.other_findings}</p>
              </CardContent>
            </Card>
          )}

          {/* Conclusions */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Conclusioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{report.conclusions}</p>
              {report.recommendations && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Raccomandazioni:</p>
                  <p className="whitespace-pre-wrap">{report.recommendations}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{report.customer.name}</p>
              {report.customer.email && (
                <p className="text-sm text-muted-foreground">{report.customer.email}</p>
              )}
              <p className="text-sm text-muted-foreground">{report.customer.phone}</p>
              {report.customer.address && (
                <p className="text-sm text-muted-foreground">{report.customer.address}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destinatario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge>{purposeLabels[report.purpose] || report.purpose}</Badge>
              {report.recipient_name && (
                <p className="font-medium">{report.recipient_name}</p>
              )}
              {report.recipient_role && (
                <p className="text-sm text-muted-foreground">{report.recipient_role}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tecnico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{report.technician_name}</p>
              {report.technician_qualification && (
                <p className="text-sm text-muted-foreground">{report.technician_qualification}</p>
              )}
            </CardContent>
          </Card>

          {report.sent_at && (
            <Card>
              <CardHeader>
                <CardTitle>Invio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  Inviata il {format(new Date(report.sent_at), 'd MMMM yyyy HH:mm', { locale: it })}
                </p>
                {report.sent_to_email && (
                  <p className="text-sm text-muted-foreground">a: {report.sent_to_email}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
