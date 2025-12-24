import { MemoryStick, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface RamWidgetProps {
  totalMb: number | null;
  availableMb: number | null;
  percentUsed: number | null;
}

export const RamWidget = ({ totalMb, availableMb, percentUsed }: RamWidgetProps) => {
  const isNative = Capacitor.isNativePlatform();
  
  // Check if data seems invalid (0 RAM or no data on native platform)
  const dataSeemsBroken = isNative && (totalMb === null || totalMb === 0 || (percentUsed !== null && percentUsed === 0 && availableMb === totalMb));
  
  const getRamColor = () => {
    if (percentUsed === null || dataSeemsBroken) return 'text-muted-foreground';
    if (percentUsed >= 90) return 'text-destructive';
    if (percentUsed >= 80) return 'text-amber-500';
    return 'text-purple-500';
  };

  const getProgressColor = () => {
    if (percentUsed === null || dataSeemsBroken) return 'bg-muted';
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
          {dataSeemsBroken ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Plugin nativo richiesto</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per i dati reali della RAM, installa il plugin Android.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
