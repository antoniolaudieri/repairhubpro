import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { useDymoPrinter } from '@/hooks/useDymoPrinter';
import { generateRepairLabel, LabelFormat } from '@/utils/labelTemplates';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface PrintLabelButtonProps {
  repairId: string;
  customerName: string;
  customerPhone: string;
  deviceBrand: string;
  deviceModel: string;
  deviceType: string;
  issueDescription: string;
  createdAt: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export function PrintLabelButton({
  repairId,
  customerName,
  customerPhone,
  deviceBrand,
  deviceModel,
  deviceType,
  issueDescription,
  createdAt,
  variant = 'outline',
  size = 'default',
  className = '',
  showLabel = true,
}: PrintLabelButtonProps) {
  const { environment, selectedPrinter, printLabel, isLoading, checkEnvironment, refreshPrinters } = useDymoPrinter();
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    // Check if Dymo is available
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

    setIsPrinting(true);
    try {
      const labelXml = generateRepairLabel({
        repairId,
        customerName,
        phone: customerPhone,
        deviceBrand,
        deviceModel,
        deviceType,
        issueDescription,
        intakeDate: format(new Date(createdAt), 'dd/MM/yyyy HH:mm', { locale: it }),
      });

      await printLabel(labelXml);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Errore nella stampa etichetta');
    } finally {
      setIsPrinting(false);
    }
  };

  const loading = isPrinting || isLoading;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {showLabel && <span className="ml-2">{loading ? 'Stampa...' : 'Etichetta'}</span>}
    </Button>
  );
}
