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
        <div className="space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Perizie Forensi</h1>
              <p className="text-muted-foreground text-sm">
                Report professionali • Tariffa minima €{MINIMUM_REPORT_PRICE}
              </p>
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova Perizia
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reports.length}</p>
                    <p className="text-xs text-muted-foreground">Totale Perizie</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reports.filter(r => r.status === 'draft').length}</p>
                    <p className="text-xs text-muted-foreground">Bozze</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reports.filter(r => r.status === 'sent').length}</p>
                    <p className="text-xs text-muted-foreground">Inviate</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Euro className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{totalRevenue}</p>
                    <p className="text-xs text-muted-foreground">Fatturato Stimato</p>
                  </div>
                </div>
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
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nessuna perizia trovata</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Crea la tua prima perizia forense per un cliente
                </p>
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Perizia
                </Button>
              </Card>
            ) : (
              filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 hover:shadow-md transition-all hover:border-primary/30">
                    <div className="flex items-center justify-between gap-4">
                      <div 
                        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/centro/perizie/${report.id}`)}
                      >
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium">{report.report_number}</span>
                            <Badge variant={statusConfig[report.status]?.variant || 'secondary'}>
                              {statusConfig[report.status]?.label || report.status}
                            </Badge>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-500/10">
                              €{MINIMUM_REPORT_PRICE}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1 truncate">{report.customer?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {report.device_brand} {report.device_model} • {purposeLabels[report.purpose] || report.purpose}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(report.report_date), 'd MMM yyyy', { locale: it })}
                            {report.sent_at && (
                              <span className="text-emerald-600 ml-2">
                                • Inviata {format(new Date(report.sent_at), 'd MMM', { locale: it })}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {report.customer?.email && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(report);
                            }}
                            disabled={sendingEmail === report.id}
                            className="gap-1 bg-blue-600 hover:bg-blue-700"
                          >
                            {sendingEmail === report.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Invia Email</span>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(report.id);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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