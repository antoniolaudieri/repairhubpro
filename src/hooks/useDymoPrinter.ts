import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface DymoPrinter {
  name: string;
  modelName: string;
  isConnected: boolean;
  isLocal: boolean;
}

interface DymoEnvironment {
  isSupported: boolean;
  isInstalled: boolean;
  isServiceRunning: boolean;
  errorMessage?: string;
}

interface UseDymoPrinterReturn {
  printers: DymoPrinter[];
  selectedPrinter: string | null;
  setSelectedPrinter: (name: string | null) => void;
  environment: DymoEnvironment | null;
  isLoading: boolean;
  isInitialized: boolean;
  checkEnvironment: () => Promise<DymoEnvironment>;
  refreshPrinters: () => Promise<DymoPrinter[]>;
  printLabel: (labelXml: string, copies?: number) => Promise<boolean>;
  printTestLabel: () => Promise<boolean>;
}

export function useDymoPrinter(): UseDymoPrinterReturn {
  const [printers, setPrinters] = useState<DymoPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<DymoEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkEnvironment = useCallback(async (): Promise<DymoEnvironment> => {
    setIsLoading(true);
    try {
      // Check if dymo object exists
      if (typeof window === 'undefined' || !window.dymo) {
        const env: DymoEnvironment = {
          isSupported: false,
          isInstalled: false,
          isServiceRunning: false,
          errorMessage: 'Dymo Connect Framework non caricato. Ricarica la pagina.',
        };
        setEnvironment(env);
        return env;
      }

      // Initialize the framework
      await window.dymo.connect.framework.init();
      
      // Check environment
      const envCheck = await window.dymo.connect.framework.checkEnvironment();
      
      const env: DymoEnvironment = {
        isSupported: envCheck.isBrowserSupported,
        isInstalled: envCheck.isFrameworkInstalled,
        isServiceRunning: envCheck.isWebServicePresent,
        errorMessage: envCheck.errorDetails,
      };

      if (!env.isServiceRunning) {
        env.errorMessage = 'Dymo Connect non è in esecuzione. Avvia l\'applicazione Dymo Connect.';
      }

      setEnvironment(env);
      setIsInitialized(true);
      return env;
    } catch (error: any) {
      console.error('Dymo environment check error:', error);
      const env: DymoEnvironment = {
        isSupported: false,
        isInstalled: false,
        isServiceRunning: false,
        errorMessage: error.message || 'Errore nella verifica dell\'ambiente Dymo',
      };
      setEnvironment(env);
      return env;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPrinters = useCallback(async (): Promise<DymoPrinter[]> => {
    setIsLoading(true);
    try {
      if (!window.dymo) {
        throw new Error('Dymo Connect Framework non disponibile');
      }

      const dymoprinters = await window.dymo.connect.framework.getPrinters();
      
      // Filter only LabelWriter printers that are connected
      const labelWriters = dymoprinters
        .filter((p) => p.isConnected && p.modelName.includes('LabelWriter'))
        .map((p) => ({
          name: p.name,
          modelName: p.modelName,
          isConnected: p.isConnected,
          isLocal: p.isLocal,
        }));

      setPrinters(labelWriters);
      
      // Auto-select first printer if none selected
      if (labelWriters.length > 0 && !selectedPrinter) {
        setSelectedPrinter(labelWriters[0].name);
      }

      return labelWriters;
    } catch (error: any) {
      console.error('Error fetching printers:', error);
      setPrinters([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  const printLabel = useCallback(async (labelXml: string, copies: number = 1): Promise<boolean> => {
    if (!selectedPrinter) {
      toast.error('Nessuna stampante selezionata');
      return false;
    }

    if (!window.dymo) {
      toast.error('Dymo Connect Framework non disponibile');
      return false;
    }

    setIsLoading(true);
    try {
      const printParams = window.dymo.connect.framework.createLabelWriterPrintParamsXml({
        copies,
        printQuality: 'BarcodeAndGraphics',
      });

      await window.dymo.connect.framework.printLabel(
        selectedPrinter,
        printParams,
        labelXml
      );

      toast.success(`Etichetta stampata su ${selectedPrinter}`);
      return true;
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(`Errore stampa: ${error.message || 'Errore sconosciuto'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter]);

  const printTestLabel = useCallback(async (): Promise<boolean> => {
    // Simple test label XML
    const testLabelXml = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Address</Id>
  <PaperName>30252 Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="1581" Height="5040" Rx="270" Ry="270"/>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>Text</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"/>
      <LinkedObjectName></LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>True</IsVariable>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>TEST STAMPA</String>
          <Attributes>
            <Font Family="Arial" Size="14" Bold="True" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;LabLinkRiparo</String>
          <Attributes>
            <Font Family="Arial" Size="10" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"/>
          </Attributes>
        </Element>
        <Element>
          <String>&#13;&#10;${new Date().toLocaleString('it-IT')}</String>
          <Attributes>
            <Font Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"/>
            <ForeColor Alpha="255" Red="128" Green="128" Blue="128"/>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="331" Y="150" Width="4368" Height="1231"/>
  </ObjectInfo>
</DieCutLabel>`;

    return printLabel(testLabelXml);
  }, [printLabel]);

  // Auto-initialize on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.dymo) {
        checkEnvironment();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [checkEnvironment]);

  return {
    printers,
    selectedPrinter,
    setSelectedPrinter,
    environment,
    isLoading,
    isInitialized,
    checkEnvironment,
    refreshPrinters,
    printLabel,
    printTestLabel,
  };
}
