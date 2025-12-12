// Type declarations for Dymo Connect Framework
declare namespace dymo {
  namespace connect {
    namespace framework {
      function init(): Promise<void>;
      function getPrinters(): Promise<DymoPrinter[]>;
      function printLabel(
        printerName: string,
        printParamsXml: string,
        labelXml: string,
        labelSetXml?: string
      ): Promise<void>;
      function openLabelFile(fileName: string): Promise<DymoLabel>;
      function createLabelWriterPrintParamsXml(params: PrintParams): string;
      function checkEnvironment(): Promise<DymoEnvironment>;
    }
  }

  interface DymoPrinter {
    name: string;
    modelName: string;
    isConnected: boolean;
    isTwinTurbo: boolean;
    isLocal: boolean;
  }

  interface DymoLabel {
    getAddressObjectCount(): number;
    getObjectNames(): string[];
    setObjectText(objectName: string, text: string): void;
    getLabelXml(): string;
  }

  interface PrintParams {
    copies?: number;
    jobTitle?: string;
    flowDirection?: 'LeftToRight' | 'RightToLeft';
    printQuality?: 'Text' | 'BarcodeAndGraphics';
    twinTurboRoll?: 'Left' | 'Right' | 'Auto';
  }

  interface DymoEnvironment {
    isBrowserSupported: boolean;
    isFrameworkInstalled: boolean;
    isWebServicePresent: boolean;
    errorDetails?: string;
  }
}

interface Window {
  dymo: typeof dymo;
}
