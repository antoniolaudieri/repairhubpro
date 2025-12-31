import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { usePrintQueue } from '@/hooks/usePrintQueue';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateRepairLabel, getLabelFormats, LabelFormat } from '@/utils/labelTemplates';
import { Printer, Loader2, Tag, Edit3, Eye, QrCode, Cloud, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

interface LabelData {
  repairId: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  deviceType: string;
  issueDescription: string;
  createdAt: string;
}

interface LabelPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LabelData;
}

type LabelStyle = 'standard' | 'compact' | 'qrcode';

const LABEL_STYLES: { value: LabelStyle; label: string; description: string }[] = [
  { value: 'qrcode', label: 'Con QR Code', description: 'Info + QR per scansione rapida' },
  { value: 'standard', label: 'Standard', description: 'ID, cliente, dispositivo, problema' },
  { value: 'compact', label: 'Compatto', description: 'Solo ID e dispositivo' },
];

const PAPER_FORMATS = getLabelFormats();

export function LabelPreviewDialog({ open, onOpenChange, data }: LabelPreviewDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { environment, selectedPrinter, printLabel, isLoading, checkEnvironment, refreshPrinters } = useDymoPrinter();
  const [centroId, setCentroId] = useState<string | null>(null);
  const { addRepairLabel } = usePrintQueue(centroId);
  
  // Editable fields - use empty string defaults to avoid crashes when data is undefined
  const [customerName, setCustomerName] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [issue, setIssue] = useState('');
  
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('11354'); // Default to 57x32mm
  const [labelStyle, setLabelStyle] = useState<LabelStyle>('qrcode');
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingToQueue, setIsSendingToQueue] = useState(false);
  const [sentToQueue, setSentToQueue] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Fetch Centro ID
  useEffect(() => {
    const fetchCentroId = async () => {
      if (!user) return;
      const { data: centro } = await supabase
        .from('centri_assistenza')
        .select('id')
        .eq('owner_user_id', user.id)
        .single();
      if (centro) setCentroId(centro.id);
    };
    fetchCentroId();
  }, [user]);

  // Reset fields when dialog opens with new data
  useEffect(() => {
    if (open && data) {
      setCustomerName(data.customerName || '');
      setDeviceInfo(`${data.deviceBrand || ''} ${data.deviceModel || ''}`.trim());
      setIssue(data.issueDescription || '');
      setSentToQueue(false);
    }
  }, [open, data]);

  const shortId = data?.repairId?.slice(0, 8).toUpperCase() || '';
  const intakeDate = data?.createdAt ? format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '';

  // Get label dimensions for preview (scaled for display)
  const getLabelDimensions = () => {
    switch (labelFormat) {
      case '30252': return { width: 260, height: 85 }; // 89x28mm
      case '99012': return { width: 260, height: 105 }; // 89x36mm
      case '11354': return { width: 180, height: 100 }; // 57x32mm (default)
      case '30336': return { width: 170, height: 80 }; // 54x25mm
      default: return { width: 180, height: 100 };
    }
  };

  const dimensions = getLabelDimensions();

  const handlePrint = async () => {
    // Check Dymo environment
    if (!environment?.isServiceRunning) {
      const env = await checkEnvironment();
      if (!env.isServiceRunning) {
        toast.error('Dymo Connect non è in esecuzione', {
          description: 'Avvia Dymo Connect e riprova',
        });
        return;
      }
      await refreshPrinters();
    }

    if (!selectedPrinter) {
      toast.error('Nessuna stampante Dymo configurata', {
        description: 'Configura una stampante nelle Impostazioni',
      });
      return;
    }

    if (!data) {
      toast.error('Dati etichetta non disponibili');
      return;
    }

    setIsPrinting(true);
    try {
      const labelXml = generateRepairLabel({
        repairId: data.repairId || '',
        customerName: customerName.substring(0, 25),
        phone: data.customerPhone || '',
        deviceBrand: data.deviceBrand || '',
        deviceModel: data.deviceModel || '',
        deviceType: data.deviceType || '',
        issueDescription: issue.substring(0, 40),
        intakeDate,
      }, labelFormat);

      await printLabel(labelXml);
      onOpenChange(false);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Errore nella stampa etichetta');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSendToQueue = async () => {
    if (!data || !centroId) {
      toast.error('Dati non disponibili');
      return;
    }
    setIsSendingToQueue(true);
    try {
      const success = await addRepairLabel({
        repairId: data.repairId || '',
        customerName: customerName.substring(0, 25),
        deviceBrand: data.deviceBrand || '',
        deviceModel: data.deviceModel || '',
        deviceType: data.deviceType || '',
        issue: issue.substring(0, 40),
        date: intakeDate,
      });
      if (success) {
        setSentToQueue(true);
      }
    } finally {
      setIsSendingToQueue(false);
    }
  };

  const handleGoToPrintAgent = () => {
    onOpenChange(false);
    navigate('/centro/print-agent');
  };

  const loading = isPrinting || isLoading || isSendingToQueue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Stampa Etichetta
          </DialogTitle>
          <DialogDescription>
            Personalizza e stampa l'etichetta per la riparazione #{shortId}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'edit')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Anteprima
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Edit3 className="h-4 w-4" />
              Modifica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {/* Label Preview - più spazio e testo leggibile */}
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              <div 
                className="bg-white border-2 border-dashed border-gray-300 rounded shadow-sm p-4 flex flex-col overflow-hidden"
                style={{ 
                  width: dimensions.width + 40, 
                  minHeight: dimensions.height + 20 
                }}
              >
                {labelStyle === 'compact' ? (
                  <div className="flex flex-col justify-center gap-2 h-full">
                    <div className="font-bold text-lg text-gray-900">#{shortId}</div>
                    <div className="text-sm text-gray-600 break-words">{deviceInfo || 'Dispositivo'}</div>
                  </div>
                ) : labelStyle === 'qrcode' ? (
                  <div className="flex gap-3 h-full">
                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                      <div className="font-bold text-lg text-gray-900">#{shortId}</div>
                      <div className="text-sm font-medium text-gray-800 break-words leading-tight">{customerName || 'Cliente'}</div>
                      <div className="text-xs text-gray-600 break-words leading-tight">{deviceInfo || 'Dispositivo'}</div>
                      <div className="text-[10px] text-gray-400 mt-auto">{intakeDate}</div>
                    </div>
                    <div className="flex-shrink-0 self-center">
                      <QRCodeSVG 
                        value={`${window.location.origin}/centro/lavori/${data?.repairId || ''}`}
                        size={60}
                        level="M"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 h-full">
                    <div className="font-bold text-lg text-gray-900">#{shortId}</div>
                    <div className="text-sm font-medium text-gray-800 break-words leading-tight">{customerName || 'Cliente'}</div>
                    <div className="text-xs text-gray-600 break-words leading-tight">{deviceInfo || 'Dispositivo'}</div>
                    <div className="text-xs text-gray-500 break-words italic leading-tight">{issue || 'Problema'}</div>
                    <div className="text-[10px] text-gray-400 mt-auto">{intakeDate}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Format Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formato Carta</Label>
                <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LabelFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stile Etichetta</Label>
                <Select value={labelStyle} onValueChange={(v) => setLabelStyle(v as LabelStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABEL_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        <div className="flex flex-col">
                          <span>{style.label}</span>
                          <span className="text-xs text-muted-foreground">{style.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info stile QR code */}
            {labelStyle === 'qrcode' && (
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
                <QrCode className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-sm">
                  Il QR code permette di scansionare l'etichetta e aprire la riparazione direttamente.
                </AlertDescription>
              </Alert>
            )}

            {/* Info sulla stampa - niente più "nessuna stampante" */}
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <Cloud className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                Usa <strong>Coda Remota</strong> per inviare l'etichetta al Print Agent sul PC con la stampante Dymo.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Nome Cliente</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={25}
                  placeholder="Nome cliente"
                />
                <p className="text-xs text-muted-foreground">{customerName.length}/25 caratteri</p>
              </div>

              <div className="space-y-2">
                <Label>Dispositivo</Label>
                <Input
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  maxLength={30}
                  placeholder="Marca e modello"
                />
                <p className="text-xs text-muted-foreground">{deviceInfo.length}/30 caratteri</p>
              </div>

              <div className="space-y-2">
                <Label>Problema</Label>
                <Textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  maxLength={40}
                  rows={2}
                  placeholder="Descrizione problema"
                />
                <p className="text-xs text-muted-foreground">{issue.length}/40 caratteri</p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Campi non modificabili:</p>
              <ul className="text-xs space-y-1">
                <li>• ID Riparazione: #{shortId}</li>
                <li>• Data Ritiro: {intakeDate}</li>
                <li>• Telefono: {data?.customerPhone || '-'}</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {sentToQueue ? (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              <strong>Etichetta aggiunta alla coda!</strong>
              <p className="text-sm mt-1">
                Apri il Print Agent Standalone sul PC con la stampante per stampare.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sentToQueue ? 'Chiudi' : 'Annulla'}
          </Button>
          {sentToQueue ? (
            <Button onClick={handleGoToPrintAgent} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Vai al Print Agent
            </Button>
          ) : (
            <>
              <Button 
                variant="secondary" 
                onClick={handleSendToQueue} 
                disabled={loading || !centroId} 
                className="gap-2"
              >
                {isSendingToQueue ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                Coda Remota
              </Button>
              <Button onClick={handlePrint} disabled={loading} className="gap-2">
                {isPrinting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                Stampa Locale
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
