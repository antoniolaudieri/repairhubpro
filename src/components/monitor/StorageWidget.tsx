import { HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StorageWidgetProps {
  totalGb: number | null;
  usedGb: number | null;
  availableGb: number | null;
  percentUsed: number | null;
}

export const StorageWidget = ({ totalGb, usedGb, availableGb, percentUsed }: StorageWidgetProps) => {
  const getStorageColor = () => {
    if (percentUsed === null) return 'text-muted-foreground';
    if (percentUsed >= 90) return 'text-destructive';
    if (percentUsed >= 80) return 'text-amber-500';
    return 'text-blue-500';
  };

  const getProgressColor = () => {
    if (percentUsed === null) return 'bg-muted';
    if (percentUsed >= 90) return 'bg-destructive';
    if (percentUsed >= 80) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <HardDrive className={cn('h-4 w-4', getStorageColor())} />
          Archiviazione
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={cn('text-3xl font-bold', getStorageColor())}>
              {percentUsed !== null ? `${percentUsed}%` : '--'}
            </span>
            <span className="text-xs text-muted-foreground">
              utilizzato
            </span>
          </div>
          
          <Progress 
            value={percentUsed || 0} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
          
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="block text-foreground font-medium">
                {usedGb !== null ? `${usedGb} GB` : '--'}
              </span>
              <span>Usato</span>
            </div>
            <div className="text-right">
              <span className="block text-foreground font-medium">
                {availableGb !== null ? `${availableGb} GB` : '--'}
              </span>
              <span>Libero</span>
            </div>
          </div>
          
          {totalGb !== null && (
            <p className="text-xs text-center text-muted-foreground">
              Totale: {totalGb} GB
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
