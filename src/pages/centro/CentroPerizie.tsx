import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CentroLayout } from '@/layouts/CentroLayout';
import { PageTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Send, Eye, Trash2, Search, Euro, Clock, CheckCircle2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import CreateForensicReportDialog from '@/components/centro/CreateForensicReportDialog';
import { motion } from 'framer-motion';

interface ForensicReport {
  id: string;
  report_number: string;
  report_date: string;
  purpose: string;
  status: string;
  sent_at: string | null;
  customer: {
    name: string;
    email: string | null;
  };
  device_brand: string | null;
  device_model: string | null;
  device_type: string;
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

const MINIMUM_REPORT_PRICE = 60;

export default function CentroPerizie() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ForensicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [centro, setCentro] = useState<Centro | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCentroAndReports();
    }
  }, [user]);

  const loadCentroAndReports = async () => {
    try {
      const { data: centroData } = await supabase
        .from('centri_assistenza')
        .select('id, business_name, address, phone, email, vat_number, logo_url')
        .eq('owner_user_id', user!.id)
        .single();

      if (centroData) {
        setCentro(centroData);
        await loadReports(centroData.id);
      }
    } catch (error) {
      console.error('Error loading centro:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (cId: string) => {
    const { data, error } = await supabase
      .from('forensic_reports')
      .select(`
        id,
        report_number,
        report_date,
        purpose,
        status,
        sent_at,
        device_brand,
        device_model,
        device_type,
        customer:customers(name, email)
      `)
      .eq('centro_id', cId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reports:', error);
      toast.error('Errore nel caricamento delle perizie');
    } else {
      setReports(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa perizia?')) return;

    const { error } = await supabase
      .from('forensic_reports')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Errore nell\'eliminazione');
    } else {
      toast.success('Perizia eliminata');
      if (centro) loadReports(centro.id);
    }
  };

  const handleSendEmail = async (report: ForensicReport) => {
    if (!centro || !report.customer.email) {
      toast.error('Email cliente non disponibile');
      return;
    }

    setSendingEmail(report.id);

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
      if (centro) loadReports(centro.id);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Errore nell\'invio email');
    } finally {
      setSendingEmail(null);
    }
  };

  const filteredReports = reports.filter(r => 
    r.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.device_brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.device_model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = reports.length * MINIMUM_REPORT_PRICE;

  if (loading) {
    return (
      <CentroLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </CentroLayout>
    );
  }

  return (
    <CentroLayout>
      <PageTransition>
        <div className="space-y-6">
          {/* Hero Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-bold">Perizie Forensi</h1>
                </div>
                <p className="text-slate-300 text-sm">
                  Report professionali per avvocati, polizia postale e assicurazioni
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Tariffa minima: <span className="text-green-400 font-semibold">€{MINIMUM_REPORT_PRICE}</span> per perizia
                </p>
              </div>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuova Perizia
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{reports.length}</p>
                      <p className="text-xs text-muted-foreground">Totale Perizie</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{reports.filter(r => r.status === 'draft').length}</p>
                      <p className="text-xs text-muted-foreground">Bozze</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{reports.filter(r => r.status === 'sent').length}</p>
                      <p className="text-xs text-muted-foreground">Inviate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <Euro className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">€{totalRevenue}</p>
                      <p className="text-xs text-muted-foreground">Fatturato Stimato</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per numero, cliente o dispositivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Reports List */}
          <div className="space-y-3">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">Nessuna perizia trovata</h3>
                  <p className="text-muted-foreground mb-4">
                    Crea la tua prima perizia forense per un cliente
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuova Perizia
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary/10 rounded">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold">{report.report_number}</span>
                            <Badge variant={statusConfig[report.status]?.variant || 'secondary'}>
                              {statusConfig[report.status]?.label || report.status}
                            </Badge>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                              €{MINIMUM_REPORT_PRICE}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <p><span className="font-medium text-foreground">Cliente:</span> {report.customer?.name}</p>
                            <p><span className="font-medium text-foreground">Destinatario:</span> {purposeLabels[report.purpose] || report.purpose}</p>
                            <p><span className="font-medium text-foreground">Dispositivo:</span> {report.device_brand} {report.device_model}</p>
                            <p><span className="font-medium text-foreground">Data:</span> {format(new Date(report.report_date), 'd MMM yyyy', { locale: it })}</p>
                          </div>
                          {report.sent_at && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Inviata il {format(new Date(report.sent_at), 'd MMMM yyyy HH:mm', { locale: it })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/centro/perizie/${report.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Dettagli
                          </Button>
                          {report.status !== 'draft' && report.customer?.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(report)}
                              disabled={sendingEmail === report.id}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              {sendingEmail === report.id ? 'Invio...' : 'Invia'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(report.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          <CreateForensicReportDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            centroId={centro?.id || null}
            onSuccess={() => {
              if (centro) loadReports(centro.id);
            }}
          />
        </div>
      </PageTransition>
    </CentroLayout>
  );
}