import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Dymo Connect Web Service runs locally on various ports
// Different versions use different ports, try all known variations
const DYMO_ENDPOINTS = [
  // Dymo Connect (newer versions)
  { host: 'localhost', port: 41951, protocol: 'https' },
  { host: '127.0.0.1', port: 41951, protocol: 'https' },
  { host: 'localhost', port: 41952, protocol: 'http' },
  { host: '127.0.0.1', port: 41952, protocol: 'http' },
  // Dymo Label Web Service (older versions)
  { host: 'localhost', port: 8080, protocol: 'http' },
  { host: '127.0.0.1', port: 8080, protocol: 'http' },
  // Some versions use these ports
  { host: 'localhost', port: 443, protocol: 'https' },
  { host: 'localhost', port: 8443, protocol: 'https' },
];

// Check if current page is served over HTTPS
const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

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
  serviceUrl?: string;
  errorMessage?: string;
  isMixedContentBlocked?: boolean;
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

// Try to find the running Dymo service
async function findDymoService(): Promise<{ url: string; port: number } | null> {
  // If running on HTTPS, we can only try HTTPS endpoints due to mixed content restrictions
  const endpointsToTry = isSecureContext 
    ? DYMO_ENDPOINTS.filter(e => e.protocol === 'https')
    : DYMO_ENDPOINTS;

  // Try all endpoints in parallel for faster detection
  const attempts = endpointsToTry.map(async ({ host, port, protocol }) => {
    const url = `${protocol}://${host}:${port}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${url}/DYMO/DLS/Printing/StatusConnected`, {
        method: 'GET',
        signal: controller.signal,
        // Note: mode 'no-cors' won't give us usable response, but 'cors' may be blocked
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Dymo service found at ${url}`);
        return { url, port };
      }
    } catch (e) {
      // This endpoint didn't work - expected for most endpoints
      console.debug(`Dymo not available at ${url}`);
    }
    return null;
  });

  // Return first successful result
  const results = await Promise.allSettled(attempts);
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value;
    }
  }
  
  return null;
}

// Get printers from Dymo service
async function getDymoPrinters(serviceUrl: string): Promise<DymoPrinter[]> {
  try {
    const response = await fetch(`${serviceUrl}/DYMO/DLS/Printing/GetPrinters`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get printers');
    }
    
    const xmlText = await response.text();
    
    // Parse XML response
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const printerNodes = xmlDoc.querySelectorAll('LabelWriterPrinter');
    
    const printers: DymoPrinter[] = [];
    printerNodes.forEach((node) => {
      const name = node.querySelector('Name')?.textContent || '';
      const modelName = node.querySelector('ModelName')?.textContent || '';
      const isConnected = node.querySelector('IsConnected')?.textContent === 'True';
      const isLocal = node.querySelector('IsLocal')?.textContent === 'True';
      
      if (name && modelName.includes('LabelWriter')) {
        printers.push({ name, modelName, isConnected, isLocal });
      }
    });
    
    return printers;
  } catch (error) {
    console.error('Error fetching printers:', error);
    return [];
  }
}

// Print label via Dymo service
async function printLabelViaDymo(
  serviceUrl: string,
  printerName: string,
  labelXml: string,
  copies: number = 1
): Promise<boolean> {
  try {
    const printParams = `
      <LabelWriterPrintParams>
        <Copies>${copies}</Copies>
        <PrintQuality>BarcodeAndGraphics</PrintQuality>
        <JobTitle>LabLinkRiparo Label</JobTitle>
      </LabelWriterPrintParams>
    `;
    
    const formData = new URLSearchParams();
    formData.append('printerName', printerName);
    formData.append('printParamsXml', printParams);
    formData.append('labelXml', labelXml);
    formData.append('labelSetXml', '');
    
    const response = await fetch(`${serviceUrl}/DYMO/DLS/Printing/PrintLabel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      throw new Error(`Print failed: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
}

export function useDymoPrinter(): UseDymoPrinterReturn {
  const [printers, setPrinters] = useState<DymoPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<DymoEnvironment | null>(null);
  const [serviceUrl, setServiceUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkEnvironment = useCallback(async (): Promise<DymoEnvironment> => {
    setIsLoading(true);
    try {
      const service = await findDymoService();
      
      if (service) {
        const env: DymoEnvironment = {
          isSupported: true,
          isInstalled: true,
          isServiceRunning: true,
          serviceUrl: service.url,
          isMixedContentBlocked: false,
        };
        setEnvironment(env);
        setServiceUrl(service.url);
        setIsInitialized(true);
        return env;
      }
      
      // If we're on HTTPS, mixed content is likely the issue
      const env: DymoEnvironment = {
        isSupported: true,
        isInstalled: false,
        isServiceRunning: false,
        isMixedContentBlocked: isSecureContext,
        errorMessage: isSecureContext 
          ? 'Connessione bloccata: questa pagina è servita su HTTPS ma Dymo Web Service usa HTTP. Esegui l\'app su http://localhost per usare Dymo.'
          : 'Dymo Connect Web Service non trovato. Assicurati che Dymo Connect sia installato e il servizio sia in esecuzione.',
      };
      setEnvironment(env);
      return env;
    } catch (error: any) {
      console.error('Dymo environment check error:', error);
      const env: DymoEnvironment = {
        isSupported: false,
        isInstalled: false,
        isServiceRunning: false,
        isMixedContentBlocked: isSecureContext,
        errorMessage: error.message || 'Errore nella verifica Dymo Connect',
      };
      setEnvironment(env);
      return env;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPrinters = useCallback(async (): Promise<DymoPrinter[]> => {
    if (!serviceUrl) {
      const env = await checkEnvironment();
      if (!env.serviceUrl) {
        return [];
      }
    }
    
    setIsLoading(true);
    try {
      const url = serviceUrl || environment?.serviceUrl;
      if (!url) return [];
      
      const dymoprinters = await getDymoPrinters(url);
      const connectedPrinters = dymoprinters.filter((p) => p.isConnected);
      
      setPrinters(connectedPrinters);
      
      // Auto-select first printer if none selected
      if (connectedPrinters.length > 0 && !selectedPrinter) {
        setSelectedPrinter(connectedPrinters[0].name);
      }
      
      return connectedPrinters;
    } catch (error: any) {
      console.error('Error fetching printers:', error);
      setPrinters([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [serviceUrl, environment, selectedPrinter, checkEnvironment]);

  const printLabel = useCallback(async (labelXml: string, copies: number = 1): Promise<boolean> => {
    if (!selectedPrinter) {
      toast.error('Nessuna stampante selezionata');
      return false;
    }

    const url = serviceUrl || environment?.serviceUrl;
    if (!url) {
      toast.error('Dymo Connect non disponibile');
      return false;
    }

    setIsLoading(true);
    try {
      await printLabelViaDymo(url, selectedPrinter, labelXml, copies);
      toast.success(`Etichetta stampata su ${selectedPrinter}`);
      return true;
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(`Errore stampa: ${error.message || 'Errore sconosciuto'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrinter, serviceUrl, environment]);

  const printTestLabel = useCallback(async (): Promise<boolean> => {
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
      checkEnvironment().then((env) => {
        if (env.isServiceRunning) {
          refreshPrinters();
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
