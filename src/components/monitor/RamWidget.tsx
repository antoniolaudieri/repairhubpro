import { MemoryStick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RamWidgetProps {
  totalMb: number | null;
  availableMb: number | null;
  percentUsed: number | null;
}

export const RamWidget = ({ totalMb, availableMb, percentUsed }: RamWidgetProps) => {
  const getRamColor = () => {
    if (percentUsed === null) return 'text-muted-foreground';
    if (percentUsed >= 90) return 'text-destructive';
    if (percentUsed >= 80) return 'text-amber-500';
    return 'text-purple-500';
  };

  const getProgressColor = () => {
    if (percentUsed === null) return 'bg-muted';
    if (percentUsed >= 90) return 'bg-destructive';
    if (percentUsed >= 80) return 'bg-amber-500';
    return 'bg-purple-500';
  };

  const formatMb = (mb: number | null) => {
    if (mb === null) return '--';
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MemoryStick className={cn('h-4 w-4', getRamColor())} />
          Memoria RAM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={cn('text-3xl font-bold', getRamColor())}>
              {percentUsed !== null ? `${percentUsed}%` : '--'}
            </span>
            <span className="text-xs text-muted-foreground">
              in uso
            </span>
          </div>
          
          <Progress 
            value={percentUsed || 0} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Disponibile: <span className="text-foreground font-medium">{formatMb(availableMb)}</span>
            </span>
            <span>
              Totale: <span className="text-foreground font-medium">{formatMb(totalMb)}</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
