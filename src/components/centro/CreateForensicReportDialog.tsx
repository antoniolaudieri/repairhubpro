import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Smartphone, Tablet, Laptop, Monitor, Sparkles, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
}

interface Device {
  id: string;
  device_type: string;
  brand: string;
  model: string;
  serial_number: string | null;
  imei: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroId: string | null;
  onSuccess: () => void;
}

const deviceIcons: Record<string, any> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  pc: Monitor,
};

export default function CreateForensicReportDialog({ open, onOpenChange, centroId, onSuccess }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');

  const [formData, setFormData] = useState({
    purpose: 'avvocato',
    recipient_name: '',
    recipient_role: '',
    device_type: 'smartphone',
    device_brand: '',
    device_model: '',
    device_serial: '',
    device_imei: '',
    device_condition: '',
    analysis_summary: '',
    malware_check: false,
    malware_findings: '',
    spyware_check: false,
    spyware_findings: '',
    compromised_accounts_check: false,
    compromised_accounts_findings: '',
    data_integrity_check: false,
    data_integrity_findings: '',
    other_findings: '',
    conclusions: '',
    recommendations: '',
    technician_name: '',
    technician_qualification: 'Tecnico Informatico'
  });

  useEffect(() => {
    if (open && centroId) {
      loadCustomers();
    }
  }, [open, centroId]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadDevices(selectedCustomerId);
    } else {
      setDevices([]);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (selectedDeviceId && devices.length > 0) {
      const device = devices.find(d => d.id === selectedDeviceId);
      if (device) {
        setFormData(prev => ({
          ...prev,
          device_type: device.device_type,
          device_brand: device.brand,
          device_model: device.model,
          device_serial: device.serial_number || '',
          device_imei: device.imei || ''
        }));
      }
    }
  }, [selectedDeviceId, devices]);

  useEffect(() => {
    if (customerSearch.trim()) {
      const search = customerSearch.toLowerCase();
      setFilteredCustomers(
        customers.filter(c =>
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          c.email?.toLowerCase().includes(search)
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [customerSearch, customers]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('centro_id', centroId)
      .order('name');
    
    setCustomers(data || []);
    setFilteredCustomers(data || []);
  };

  const loadDevices = async (customerId: string) => {
    const { data } = await supabase
      .from('devices')
      .select('id, device_type, brand, model, serial_number, imei')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    setDevices(data || []);
  };

  const generateReportNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PER-${year}-${random}`;
  };

  const handleGenerateWithAI = async () => {
    if (!diagnosisSummary.trim()) {
      toast.error('Scrivi prima un riepilogo della diagnosi');
      return;
    }

    setGenerating(true);

    try {
      const checksPerformed = [];
      if (formData.malware_check) checksPerformed.push('malware');
      if (formData.spyware_check) checksPerformed.push('spyware');
      if (formData.compromised_accounts_check) checksPerformed.push('accounts');
      if (formData.data_integrity_check) checksPerformed.push('integrity');

      const response = await supabase.functions.invoke('generate-forensic-report', {
        body: {
          diagnosisSummary,
          deviceType: formData.device_type,
          deviceBrand: formData.device_brand,
          deviceModel: formData.device_model,
          purpose: formData.purpose,
          checksPerformed
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      setFormData(prev => ({
        ...prev,
        analysis_summary: data.analysis_summary || prev.analysis_summary,
        malware_findings: data.malware_findings || prev.malware_findings,
        spyware_findings: data.spyware_findings || prev.spyware_findings,
        compromised_accounts_findings: data.compromised_accounts_findings || prev.compromised_accounts_findings,
        data_integrity_findings: data.data_integrity_findings || prev.data_integrity_findings,
        other_findings: data.other_findings || prev.other_findings,
        conclusions: data.conclusions || prev.conclusions,
        recommendations: data.recommendations || prev.recommendations
      }));

      toast.success('Documento generato con AI!');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Errore nella generazione AI');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!centroId || !selectedCustomerId) {
      toast.error('Seleziona un cliente');
      return;
    }

    if (!formData.analysis_summary || !formData.conclusions || !formData.technician_name) {
      toast.error('Compila i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('forensic_reports')
        .insert({
          centro_id: centroId,
          customer_id: selectedCustomerId,
          device_id: selectedDeviceId || null,
          report_number: generateReportNumber(),
          ...formData
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Perizia creata con successo');
      onOpenChange(false);
      onSuccess();
      navigate(`/centro/perizie/${data.id}`);
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast.error('Errore nella creazione della perizia');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nuova Perizia Forense</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Tabs defaultValue="cliente" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="analisi">Analisi</TabsTrigger>
              <TabsTrigger value="risultati">Risultati</TabsTrigger>
              <TabsTrigger value="conclusioni">Conclusioni</TabsTrigger>
            </TabsList>

            <TabsContent value="cliente" className="space-y-4 mt-4">
              {/* Customer Search */}
              <div className="space-y-2">
                <Label>Cerca Cliente *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, telefono o email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Customer Selection */}
              {!selectedCustomerId ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredCustomers.slice(0, 10).map(c => (
                    <Card
                      key={c.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch('');
                      }}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.phone} {c.email && `• ${c.email}`}</p>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun cliente trovato
                    </p>
                  )}
                </div>
              ) : (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedCustomer?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer?.phone} {selectedCustomer?.email && `• ${selectedCustomer.email}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerId('')}>
                      Cambia
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Customer Devices */}
              {selectedCustomerId && devices.length > 0 && (
                <div className="space-y-2">
                  <Label>Dispositivi del Cliente</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {devices.map(d => {
                      const Icon = deviceIcons[d.device_type] || Smartphone;
                      const isSelected = selectedDeviceId === d.id;
                      return (
                        <Card
                          key={d.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}
                          onClick={() => setSelectedDeviceId(isSelected ? '' : d.id)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{d.brand} {d.model}</p>
                              <p className="text-xs text-muted-foreground">{d.device_type}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Dispositivo *</Label>
                  <Select 
                    value={formData.device_type} 
                    onValueChange={(v) => setFormData(p => ({ ...p, device_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="smartphone">Smartphone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="pc">PC Desktop</SelectItem>
                      <SelectItem value="altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input 
                    value={formData.device_brand}
                    onChange={(e) => setFormData(p => ({ ...p, device_brand: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modello</Label>
                  <Input 
                    value={formData.device_model}
                    onChange={(e) => setFormData(p => ({ ...p, device_model: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seriale</Label>
                  <Input 
                    value={formData.device_serial}
                    onChange={(e) => setFormData(p => ({ ...p, device_serial: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IMEI</Label>
                  <Input 
                    value={formData.device_imei}
                    onChange={(e) => setFormData(p => ({ ...p, device_imei: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condizione Dispositivo</Label>
                  <Input 
                    value={formData.device_condition}
                    onChange={(e) => setFormData(p => ({ ...p, device_condition: e.target.value }))}
                    placeholder="es. Buono stato, schermo integro"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destinatario Perizia *</Label>
                <Select 
                  value={formData.purpose} 
                  onValueChange={(v) => setFormData(p => ({ ...p, purpose: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avvocato">Avvocato</SelectItem>
                    <SelectItem value="polizia_postale">Polizia Postale</SelectItem>
                    <SelectItem value="assicurazione">Assicurazione</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Destinatario</Label>
                  <Input 
                    value={formData.recipient_name}
                    onChange={(e) => setFormData(p => ({ ...p, recipient_name: e.target.value }))}
                    placeholder="es. Avv. Mario Rossi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ruolo/Qualifica</Label>
                  <Input 
                    value={formData.recipient_role}
                    onChange={(e) => setFormData(p => ({ ...p, recipient_role: e.target.value }))}
                    placeholder="es. Avvocato difensore"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analisi" className="space-y-4 mt-4">
              {/* AI Generation Section */}
              <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <Label className="text-base font-semibold">Generazione AI</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scrivi un breve riepilogo della diagnosi e l'AI genererà un documento professionale completo.
                  </p>
                  <Textarea
                    value={diagnosisSummary}
                    onChange={(e) => setDiagnosisSummary(e.target.value)}
                    placeholder="Es: Ho analizzato il dispositivo e trovato 3 app spia installate (mSpy, FlexiSpy, Cerberus). Il dispositivo presentava anche malware trojan. Gli account email e social risultano compromessi con accessi non autorizzati dalla Cina..."
                    rows={4}
                  />
                  <Button 
                    onClick={handleGenerateWithAI} 
                    disabled={generating || !diagnosisSummary.trim()}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generazione in corso...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Genera Documento con AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Sommario Analisi *</Label>
                <Textarea 
                  value={formData.analysis_summary}
                  onChange={(e) => setFormData(p => ({ ...p, analysis_summary: e.target.value }))}
                  placeholder="Descrivi brevemente le operazioni di analisi eseguite sul dispositivo..."
                  rows={4}
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="malware"
                    checked={formData.malware_check}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, malware_check: !!c }))}
                  />
                  <Label htmlFor="malware" className="font-medium">Verifica Malware</Label>
                </div>
                {formData.malware_check && (
                  <Textarea 
                    value={formData.malware_findings}
                    onChange={(e) => setFormData(p => ({ ...p, malware_findings: e.target.value }))}
                    placeholder="Risultati della scansione malware..."
                    rows={3}
                  />
                )}
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="spyware"
                    checked={formData.spyware_check}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, spyware_check: !!c }))}
                  />
                  <Label htmlFor="spyware" className="font-medium">Verifica Spyware/Software Spia</Label>
                </div>
                {formData.spyware_check && (
                  <Textarea 
                    value={formData.spyware_findings}
                    onChange={(e) => setFormData(p => ({ ...p, spyware_findings: e.target.value }))}
                    placeholder="Risultati della verifica spyware..."
                    rows={3}
                  />
                )}
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="accounts"
                    checked={formData.compromised_accounts_check}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, compromised_accounts_check: !!c }))}
                  />
                  <Label htmlFor="accounts" className="font-medium">Verifica Account Compromessi</Label>
                </div>
                {formData.compromised_accounts_check && (
                  <Textarea 
                    value={formData.compromised_accounts_findings}
                    onChange={(e) => setFormData(p => ({ ...p, compromised_accounts_findings: e.target.value }))}
                    placeholder="Risultati della verifica account..."
                    rows={3}
                  />
                )}
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="integrity"
                    checked={formData.data_integrity_check}
                    onCheckedChange={(c) => setFormData(p => ({ ...p, data_integrity_check: !!c }))}
                  />
                  <Label htmlFor="integrity" className="font-medium">Verifica Integrità Dati</Label>
                </div>
                {formData.data_integrity_check && (
                  <Textarea 
                    value={formData.data_integrity_findings}
                    onChange={(e) => setFormData(p => ({ ...p, data_integrity_findings: e.target.value }))}
                    placeholder="Risultati della verifica integrità..."
                    rows={3}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="risultati" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Altri Risultati / Note Tecniche</Label>
                <Textarea 
                  value={formData.other_findings}
                  onChange={(e) => setFormData(p => ({ ...p, other_findings: e.target.value }))}
                  placeholder="Eventuali altri risultati o note tecniche rilevanti..."
                  rows={6}
                />
              </div>
            </TabsContent>

            <TabsContent value="conclusioni" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Conclusioni *</Label>
                <Textarea 
                  value={formData.conclusions}
                  onChange={(e) => setFormData(p => ({ ...p, conclusions: e.target.value }))}
                  placeholder="Conclusioni tecniche della perizia..."
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Raccomandazioni</Label>
                <Textarea 
                  value={formData.recommendations}
                  onChange={(e) => setFormData(p => ({ ...p, recommendations: e.target.value }))}
                  placeholder="Eventuali raccomandazioni per il cliente..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Tecnico *</Label>
                  <Input 
                    value={formData.technician_name}
                    onChange={(e) => setFormData(p => ({ ...p, technician_name: e.target.value }))}
                    placeholder="Nome del tecnico"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qualifica Tecnico</Label>
                  <Input 
                    value={formData.technician_qualification}
                    onChange={(e) => setFormData(p => ({ ...p, technician_qualification: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creazione...' : 'Crea Perizia'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
