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
    // Per 11354 (57x32mm) - Landscape
    // Width = lato lungo (57mm = 2.24"), Height = lato corto (32mm = 1.26")
    const labelWidth = 2.24;
    const labelHeight = 1.26;
    
    const testLabelXml = `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="3">
    <Description>Test Label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>Small30332</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0</X>
        <Y>0</Y>
      </DYMOPoint>
      <Size>
        <Width>${labelWidth}</Width>
        <Height>${labelHeight}</Height>
      </Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        <TextObject>
          <Name>LabelText</Name>
          <Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="0" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <FitMode>AlwaysFit</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>AlwaysFit</FitMode>
            <HorizontalAlignment>Center</HorizontalAlignment>
            <VerticalAlignment>Middle</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>TEST STAMPA</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>11</FontSize>
                  <IsBold>True</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
            <LineTextSpan>
              <TextSpan>
                <Text>LabLinkRiparo</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>9</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
            <LineTextSpan>
              <TextSpan>
                <Text>${new Date().toLocaleString('it-IT')}</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>7</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0.5" G="0.5" B="0.5"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.05</X>
              <Y>0.05</Y>
            </DYMOPoint>
            <Size>
              <Width>${(labelWidth - 0.1).toFixed(2)}</Width>
              <Height>${(labelHeight - 0.1).toFixed(2)}</Height>
            </Size>
          </ObjectLayout>
        </TextObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
</DesktopLabel>`;

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
