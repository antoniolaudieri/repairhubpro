import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    setError(null);
    setScannedId(null);
    
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Check if it's a valid repair URL
          const repairIdMatch = decodedText.match(/\/centro\/lavori\/([a-f0-9-]+)/i) ||
                                decodedText.match(/\/repair\/([a-f0-9-]+)/i) ||
                                decodedText.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
          
          if (repairIdMatch) {
            const repairId = repairIdMatch[1];
            setScannedId(repairId);
            html5QrCode.stop().catch(console.error);
            setIsScanning(false);
            
            // Navigate after brief delay
            setTimeout(() => {
              onOpenChange(false);
              navigate(`/centro/lavori/${repairId}`);
              toast.success('Riparazione trovata!');
            }, 500);
          } else {
            setError('QR code non valido per una riparazione');
          }
        },
        () => {
          // QR scanning frame - do nothing
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      if (err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        setError('Accesso alla fotocamera negato. Consenti l\'accesso nelle impostazioni del browser.');
      } else if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
        setError('Nessuna fotocamera trovata su questo dispositivo.');
      } else {
        setError('Errore nell\'avvio della fotocamera: ' + (err.message || err));
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Scansione QR Riparazione
          </DialogTitle>
          <DialogDescription>
            Inquadra il QR code sull'etichetta per aprire la riparazione
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          <div 
            id="qr-reader" 
            ref={containerRef}
            className="w-full aspect-square bg-muted rounded-lg overflow-hidden relative"
          >
            {!isScanning && !error && !scannedId && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Chiudi
            </Button>
            {error && (
              <Button onClick={startScanner} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
