import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { getLabelFormats, LabelFormat } from '@/utils/labelTemplates';
import { 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  ExternalLink,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface DymoPrinterSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedPrinter: string | null;
  onPrinterChange: (printer: string | null) => void;
  labelFormat: LabelFormat;
  onLabelFormatChange: (format: LabelFormat) => void;
}

export function DymoPrinterSettings({
  enabled,
  onEnabledChange,
  selectedPrinter,
  onPrinterChange,
  labelFormat,
  onLabelFormatChange,
}: DymoPrinterSettingsProps) {
  const {
    printers,
    environment,
    isLoading,
    isInitialized,
    checkEnvironment,
    refreshPrinters,
    printTestLabel,
    setSelectedPrinter,
  } = useDymoPrinter();

  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const labelFormats = getLabelFormats();

  // Sync selected printer with hook
  useEffect(() => {
    if (selectedPrinter) {
      setSelectedPrinter(selectedPrinter);
    }
  }, [selectedPrinter, setSelectedPrinter]);

  const handleRefresh = async () => {
    await checkEnvironment();
    if (environment?.isServiceRunning) {
      await refreshPrinters();
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      toast.error('Seleziona prima una stampante');
      return;
    }
    setIsPrintingTest(true);
    await printTestLabel();
    setIsPrintingTest(false);
  };

  const handlePrinterSelect = (value: string) => {
    onPrinterChange(value);
    setSelectedPrinter(value);
  };

  const getEnvironmentStatus = () => {
    if (!environment) {
      return { icon: AlertTriangle, color: 'text-muted-foreground', message: 'Non verificato' };
    }
    if (environment.isServiceRunning) {
      return { icon: CheckCircle2, color: 'text-emerald-500', message: 'Connesso' };
    }
    if (environment.isInstalled) {
      return { icon: AlertTriangle, color: 'text-amber-500', message: 'Servizio non attivo' };
    }
    return { icon: XCircle, color: 'text-destructive', message: 'Non installato' };
  };

  const status = getEnvironmentStatus();
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          Stampante Etichette Dymo
        </CardTitle>
        <CardDescription>
          Configura la stampa etichette tramite Dymo Connect
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="dymo-enabled">Abilita Stampa Etichette</Label>
            <p className="text-sm text-muted-foreground">
              Attiva la stampa automatica di etichette sui dispositivi
            </p>
          </div>
          <Switch
            id="dymo-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {enabled && (
          <>
            {/* Environment Status */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-5 w-5 ${status.color}`} />
                <div>
                  <p className="font-medium">Stato Dymo Connect</p>
                  <p className={`text-sm ${status.color}`}>{status.message}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Error/Warning Messages */}
            {environment && !environment.isServiceRunning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  <p className="font-medium mb-2">
                    {environment.errorMessage || 'Dymo Connect non è disponibile'}
                  </p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>
                      Scarica e installa{' '}
                      <a
                        href="https://www.dymo.com/support/dymo-connect-sdk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline inline-flex items-center gap-1"
                      >
                        Dymo Connect <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Avvia l'applicazione Dymo Connect</li>
                    <li>Collega la stampante Dymo via USB</li>
                    <li>Clicca "Rileva" per verificare la connessione</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            {/* Printer Selection */}
            {environment?.isServiceRunning && (
              <>
                <div className="space-y-2">
                  <Label>Stampante</Label>
                  <div className="flex gap-2">
                    <Select
                      value={selectedPrinter || ''}
                      onValueChange={handlePrinterSelect}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleziona stampante..." />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.length === 0 ? (
                          <SelectItem value="" disabled>
                            Nessuna stampante trovata
                          </SelectItem>
                        ) : (
                          printers.map((printer) => (
                            <SelectItem key={printer.name} value={printer.name}>
                              <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4" />
                                <span>{printer.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {printer.modelName}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={() => refreshPrinters()}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {printers.length === 0 && isInitialized && (
                    <p className="text-sm text-muted-foreground">
                      Collega una stampante Dymo LabelWriter e clicca "Rileva"
                    </p>
                  )}
                </div>

                {/* Label Format */}
                <div className="space-y-2">
                  <Label>Formato Etichetta Predefinito</Label>
                  <Select
                    value={labelFormat}
                    onValueChange={(value) => onLabelFormatChange(value as LabelFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {labelFormats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            <span>{format.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Assicurati di caricare etichette compatibili nella stampante
                  </p>
                </div>

                {/* Test Print Button */}
                {selectedPrinter && (
                  <Button
                    variant="outline"
                    onClick={handleTestPrint}
                    disabled={isPrintingTest}
                    className="w-full gap-2"
                  >
                    {isPrintingTest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    Stampa Etichetta di Test
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
