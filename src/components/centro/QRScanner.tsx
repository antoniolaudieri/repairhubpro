import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRScanner({ open, onOpenChange }: QRScannerProps) {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerContainerId = useRef(`qr-reader-${Date.now()}`);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsStarting(false);
  }, []);

  const startScanner = useCallback(async () => {
    const containerId = scannerContainerId.current;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('QR reader container not found');
      return;
    }
    
    // First ensure any existing scanner is stopped
    await stopScanner();
    
    setError(null);
    setScannedId(null);
    setIsStarting(true);
    
    try {
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
        },
        (decodedText) => {
          // Check if it's a valid repair URL
          const repairIdMatch = decodedText.match(/\/centro\/lavori\/([a-f0-9-]+)/i) ||
                                decodedText.match(/\/repair\/([a-f0-9-]+)/i) ||
                                decodedText.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
          
          if (repairIdMatch) {
            const repairId = repairIdMatch[1];
            setScannedId(repairId);
            
            // Stop scanner before navigating
            stopScanner().then(() => {
              setTimeout(() => {
                onOpenChange(false);
                navigate(`/centro/lavori/${repairId}`);
                toast.success('Riparazione trovata!');
              }, 300);
            });
          } else {
            setError('QR code non valido per una riparazione');
          }
        },
        () => {
          // QR scanning frame - do nothing
        }
      );
      
      setIsScanning(true);
      setIsStarting(false);
    } catch (err: any) {
      console.error('Scanner error:', err);
      
      setIsStarting(false);
      if (err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        setError('Accesso alla fotocamera negato. Consenti l\'accesso nelle impostazioni del browser.');
      } else if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
        setError('Nessuna fotocamera trovata su questo dispositivo.');
      } else {
        setError('Errore nell\'avvio della fotocamera: ' + (err.message || err));
      }
    }
  }, [stopScanner, onOpenChange, navigate]);

  // Handle open state
  useEffect(() => {
    if (open) {
      // Reset state
      setError(null);
      setScannedId(null);
      // Generate new container ID to avoid conflicts
      scannerContainerId.current = `qr-reader-${Date.now()}`;
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch (e) {
          // Ignore errors
        }
        scannerRef.current = null;
      }
    };
  }, []);

  const handleClose = async () => {
    await stopScanner();
    onOpenChange(false);
  };

  if (!open) return null;

  // Use portal to render outside of React tree to avoid DOM conflicts
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80" 
        onClick={handleClose}
      />
      
      {/* Modal content */}
      <div 
        ref={containerRef}
        className="relative z-50 w-full max-w-md mx-4 bg-background rounded-lg shadow-lg border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Scansione QR Riparazione
            </h2>
            <p className="text-sm text-muted-foreground">
              Inquadra il QR code sull'etichetta
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Scanner container - isolated from React */}
          <div 
            id={scannerContainerId.current}
            className="w-full aspect-square bg-muted rounded-lg overflow-hidden relative"
          >
            {(isStarting || (!isScanning && !error && !scannedId)) && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Avvio fotocamera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {scannedId && (
            <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                Riparazione trovata! Apertura in corso...
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Chiudi
            </Button>
            {error && (
              <Button onClick={startScanner} disabled={isStarting} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
