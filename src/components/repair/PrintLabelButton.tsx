import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { LabelPreviewDialog } from './LabelPreviewDialog';

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
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        <Printer className="h-4 w-4" />
        {showLabel && <span className="ml-2">Etichetta</span>}
      </Button>

      <LabelPreviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={{
          repairId,
          customerName,
          customerPhone,
          deviceBrand,
          deviceModel,
          deviceType,
          issueDescription,
          createdAt,
        }}
      />
    </>
  );
}
