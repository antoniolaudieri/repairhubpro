import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { generateRepairLabel, getLabelFormats, LabelFormat } from '@/utils/labelTemplates';
import { Printer, Loader2, Tag, Edit3, Eye, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

type LabelStyle = 'standard' | 'compact' | 'detailed';

const LABEL_STYLES: { value: LabelStyle; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'ID, cliente, dispositivo, problema' },
  { value: 'compact', label: 'Compatto', description: 'Solo ID e dispositivo' },
  { value: 'detailed', label: 'Dettagliato', description: 'Tutte le informazioni + QR' },
];

const PAPER_FORMATS = getLabelFormats();

export function LabelPreviewDialog({ open, onOpenChange, data }: LabelPreviewDialogProps) {
  const { environment, selectedPrinter, printLabel, isLoading, checkEnvironment, refreshPrinters } = useDymoPrinter();
  
  // Editable fields - use empty string defaults to avoid crashes when data is undefined
  const [customerName, setCustomerName] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [issue, setIssue] = useState('');
  
  // Label configuration
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('30252');
  const [labelStyle, setLabelStyle] = useState<LabelStyle>('standard');
  const [showQrCode, setShowQrCode] = useState(false);
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Reset fields when dialog opens with new data
  useEffect(() => {
    if (open && data) {
      setCustomerName(data.customerName || '');
      setDeviceInfo(`${data.deviceBrand || ''} ${data.deviceModel || ''}`.trim());
      setIssue(data.issueDescription || '');
    }
  }, [open, data]);

  const shortId = data?.repairId?.slice(0, 8).toUpperCase() || '';
  const intakeDate = data?.createdAt ? format(new Date(data.createdAt), 'dd/MM/yyyy HH:mm', { locale: it }) : '';

  // Get label dimensions for preview
  const getLabelDimensions = () => {
    switch (labelFormat) {
      case '30252': return { width: 220, height: 70 }; // 89x28mm
      case '99012': return { width: 220, height: 90 }; // 89x36mm
      case '11354': return { width: 140, height: 80 }; // 57x32mm
      case '30336': return { width: 135, height: 62 }; // 54x25mm
      default: return { width: 220, height: 70 };
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

  const loading = isPrinting || isLoading;

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
            {/* Label Preview */}
            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
              <div 
                className="bg-white border-2 border-dashed border-border rounded shadow-sm p-3 flex flex-col justify-between"
                style={{ 
                  width: dimensions.width, 
                  height: dimensions.height,
                  minHeight: dimensions.height 
                }}
              >
                {labelStyle === 'compact' ? (
                  <>
                    <div className="font-bold text-sm text-foreground">#{shortId}</div>
                    <div className="text-xs text-muted-foreground truncate">{deviceInfo}</div>
                  </>
                ) : labelStyle === 'detailed' ? (
                  <div className="flex gap-2 h-full">
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="font-bold text-sm text-foreground">#{shortId}</div>
                      <div className="text-[10px] font-medium text-foreground truncate">{customerName}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{deviceInfo}</div>
                      <div className="text-[8px] text-muted-foreground/80 truncate italic">{issue}</div>
                      <div className="text-[7px] text-muted-foreground">{intakeDate}</div>
                    </div>
                    {showQrCode && (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <QrCode className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-sm text-foreground">#{shortId}</div>
                    <div className="text-[10px] font-medium text-foreground truncate">{customerName}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{deviceInfo}</div>
                    <div className="text-[8px] text-muted-foreground/80 truncate italic">{issue}</div>
                    <div className="text-[7px] text-muted-foreground">{intakeDate}</div>
                  </>
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

            {labelStyle === 'detailed' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-qr"
                  checked={showQrCode}
                  onChange={(e) => setShowQrCode(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="show-qr" className="text-sm cursor-pointer">
                  Includi QR Code per tracking
                </Label>
              </div>
            )}

            {/* Printer Status */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {selectedPrinter || 'Nessuna stampante'}
                </span>
              </div>
              {environment?.isServiceRunning ? (
                <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                  Connessa
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  Non attiva
                </Badge>
              )}
            </div>
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
                <li>• Telefono: {data.customerPhone}</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Annulla
          </Button>
          <Button onClick={handlePrint} disabled={loading} className="flex-1 gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {loading ? 'Stampa...' : 'Stampa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
