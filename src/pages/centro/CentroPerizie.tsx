import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Send, Eye, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import CreateForensicReportDialog from '@/components/centro/CreateForensicReportDialog';

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

export default function CentroPerizie() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ForensicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [centroId, setCentroId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadCentroAndReports();
    }
  }, [user]);

  const loadCentroAndReports = async () => {
    try {
      const { data: centro } = await supabase
        .from('centri_assistenza')
        .select('id')
        .eq('owner_user_id', user!.id)
        .single();

      if (centro) {
        setCentroId(centro.id);
        await loadReports(centro.id);
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
      if (centroId) loadReports(centroId);
    }
  };

  const filteredReports = reports.filter(r => 
    r.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.device_brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.device_model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Perizie Forensi</h1>
          <p className="text-muted-foreground">
            Genera report professionali per avvocati, polizia postale e assicurazioni
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Perizia
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per numero, cliente o dispositivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-sm text-muted-foreground">Totale Perizie</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'draft').length}</div>
            <p className="text-sm text-muted-foreground">Bozze</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'sent').length}</div>
            <p className="text-sm text-muted-foreground">Inviate</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
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
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-semibold">{report.report_number}</span>
                      <Badge variant={statusConfig[report.status]?.variant || 'secondary'}>
                        {statusConfig[report.status]?.label || report.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Cliente:</strong> {report.customer?.name}</p>
                      <p><strong>Dispositivo:</strong> {report.device_brand} {report.device_model} ({report.device_type})</p>
                      <p><strong>Destinatario:</strong> {purposeLabels[report.purpose] || report.purpose}</p>
                      <p><strong>Data:</strong> {format(new Date(report.report_date), 'd MMMM yyyy', { locale: it })}</p>
                      {report.sent_at && (
                        <p><strong>Inviata il:</strong> {format(new Date(report.sent_at), 'd MMMM yyyy HH:mm', { locale: it })}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/centro/perizie/${report.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Dettagli
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateForensicReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        centroId={centroId}
        onSuccess={() => {
          if (centroId) loadReports(centroId);
        }}
      />
    </div>
  );
}
