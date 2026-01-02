import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { usePrintQueue } from '@/hooks/usePrintQueue';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
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
  storageSlot?: string;
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
  const isMobile = useIsMobile();
  const { environment, selectedPrinter, printLabel, isLoading, checkEnvironment, refreshPrinters } = useDymoPrinter();
  const [centroId, setCentroId] = useState<string | null>(null);
  const { addRepairLabel } = usePrintQueue(centroId);
  
  const [customerName, setCustomerName] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [issue, setIssue] = useState('');
  
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('11354');
  const [labelStyle, setLabelStyle] = useState<LabelStyle>('qrcode');
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingToQueue, setIsSendingToQueue] = useState(false);
  const [sentToQueue, setSentToQueue] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

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
  const slotDisplay = data?.storageSlot ? `[${data.storageSlot}]` : '';

  const getLabelDimensions = () => {
    const base = isMobile ? 0.85 : 1;
    switch (labelFormat) {
      case '30252': return { width: 260 * base, height: 85 * base };
      case '99012': return { width: 260 * base, height: 105 * base };
      case '11354': return { width: 180 * base, height: 100 * base };
      case '30336': return { width: 170 * base, height: 80 * base };
      default: return { width: 180 * base, height: 100 * base };
    }
  };

  const dimensions = getLabelDimensions();

  const handlePrint = async () => {
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
      // Genera trackingUrl per QR code
      const trackingUrl = labelStyle === 'qrcode' 
        ? `${window.location.origin}/centro/lavori/${data.repairId || ''}`
        : undefined;
      
      const labelXml = generateRepairLabel({
        repairId: data.repairId || '',
        customerName: customerName.substring(0, 20),
        phone: data.customerPhone || '',
        deviceBrand: data.deviceBrand || '',
        deviceModel: data.deviceModel || '',
        deviceType: data.deviceType || '',
        issueDescription: issue.substring(0, 30),
        intakeDate,
        storageSlot: data.storageSlot,
        trackingUrl,
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
      // Genera trackingUrl per QR code nella coda remota
      const trackingUrl = labelStyle === 'qrcode' 
        ? `${window.location.origin}/centro/lavori/${data.repairId || ''}`
        : undefined;
      
      const success = await addRepairLabel({
        repairId: data.repairId || '',
        customerName: customerName.substring(0, 20),
        deviceBrand: data.deviceBrand || '',
        deviceModel: data.deviceModel || '',
        deviceType: data.deviceType || '',
        issue: issue.substring(0, 30),
        date: intakeDate,
        storageSlot: data.storageSlot,
        trackingUrl,
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

  // Shared content for both Dialog and Drawer
  const content = (
    <>
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
          {/* Label Preview */}
          <div className="flex justify-center p-3 bg-muted/30 rounded-lg">
            <div 
              className="bg-white border-2 border-dashed border-gray-300 rounded shadow-sm p-3 flex flex-col overflow-hidden"
              style={{ 
                width: dimensions.width + 30, 
                minHeight: dimensions.height + 15 
              }}
            >
              {labelStyle === 'compact' ? (
                <div className="flex flex-col justify-center gap-2 h-full">
                  <div className="font-bold text-base text-gray-900">#{shortId} {slotDisplay && <span className="text-primary">{slotDisplay}</span>}</div>
                  <div className="text-sm text-gray-600 break-words">{deviceInfo || 'Dispositivo'}</div>
                </div>
              ) : labelStyle === 'qrcode' ? (
                <div className="flex gap-2 h-full">
                  <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                    <div className="font-bold text-base text-gray-900">#{shortId} {slotDisplay && <span className="text-primary">{slotDisplay}</span>}</div>
                    <div className="text-xs font-medium text-gray-800 break-words leading-tight">{customerName || 'Cliente'}</div>
                    <div className="text-[11px] text-gray-600 break-words leading-tight">{deviceInfo || 'Dispositivo'}</div>
                    <div className="text-[9px] text-gray-400 mt-auto">{intakeDate}</div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <QRCodeSVG 
                      value={`${window.location.origin}/centro/lavori/${data?.repairId || ''}`}
                      size={isMobile ? 48 : 60}
                      level="M"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 h-full">
                  <div className="font-bold text-base text-gray-900">#{shortId} {slotDisplay && <span className="text-primary">{slotDisplay}</span>}</div>
                  <div className="text-xs font-medium text-gray-800 break-words leading-tight">{customerName || 'Cliente'}</div>
                  <div className="text-[11px] text-gray-600 break-words leading-tight">{deviceInfo || 'Dispositivo'}</div>
                  <div className="text-[11px] text-gray-500 break-words italic leading-tight">{issue || 'Problema'}</div>
                  <div className="text-[9px] text-gray-400 mt-auto">{intakeDate}</div>
                </div>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Formato Carta</Label>
              <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as LabelFormat)}>
                <SelectTrigger className="h-9">
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

            <div className="space-y-1.5">
              <Label className="text-xs">Stile Etichetta</Label>
              <Select value={labelStyle} onValueChange={(v) => setLabelStyle(v as LabelStyle)}>
                <SelectTrigger className="h-9">
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

          {labelStyle === 'qrcode' && (
            <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 py-2">
              <QrCode className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-xs">
                Il QR code permette di scansionare l'etichetta e aprire la riparazione.
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 py-2">
            <Cloud className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
              Usa <strong>Coda Remota</strong> per inviare l'etichetta al Print Agent sul PC.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="edit" className="space-y-3 mt-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome Cliente</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={25}
                placeholder="Nome cliente"
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{customerName.length}/25 caratteri</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Dispositivo</Label>
              <Input
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
                maxLength={30}
                placeholder="Marca e modello"
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">{deviceInfo.length}/30 caratteri</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Problema</Label>
              <Textarea
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                maxLength={40}
                rows={2}
                placeholder="Descrizione problema"
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground">{issue.length}/40 caratteri</p>
            </div>
          </div>

          <div className="p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Campi non modificabili:</p>
            <ul className="text-[10px] space-y-0.5">
              <li>• ID: #{shortId}</li>
              <li>• Data: {intakeDate}</li>
              <li>• Tel: {data?.customerPhone || '-'}</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>

      {sentToQueue && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-200 text-xs">
            <strong>Etichetta aggiunta alla coda!</strong>
            <p className="mt-0.5">Apri il Print Agent sul PC con la stampante per stampare.</p>
          </AlertDescription>
        </Alert>
      )}

      <div className={`flex gap-2 pt-2 ${isMobile ? 'flex-col' : ''}`}>
        {sentToQueue ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)} className={isMobile ? 'w-full' : ''}>
              Chiudi
            </Button>
            <Button onClick={handleGoToPrintAgent} className={`gap-2 ${isMobile ? 'w-full' : ''}`}>
              <ExternalLink className="h-4 w-4" />
              Vai al Print Agent
            </Button>
          </>
        ) : (
          <>
            {!isMobile && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
            )}
            <Button 
              variant="secondary" 
              onClick={handleSendToQueue} 
              disabled={loading || !centroId} 
              className={`gap-2 ${isMobile ? 'w-full' : ''}`}
            >
              {isSendingToQueue ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              Coda Remota
            </Button>
            <Button onClick={handlePrint} disabled={loading} className={`gap-2 ${isMobile ? 'w-full' : ''}`}>
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
    </>
  );

  // Mobile: use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-primary" />
              Stampa Etichetta
            </DrawerTitle>
            <DrawerDescription className="text-xs">
              Riparazione #{shortId}
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6 max-h-[calc(90vh-100px)]">
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: use Dialog
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
        {content}
      </DialogContent>
    </Dialog>
  );
}
