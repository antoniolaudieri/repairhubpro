import { HardDrive, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface StorageWidgetProps {
  totalGb: number | null;
  usedGb: number | null;
  availableGb: number | null;
  percentUsed: number | null;
}

export const StorageWidget = ({ totalGb, usedGb, availableGb, percentUsed }: StorageWidgetProps) => {
  const isNative = Capacitor.isNativePlatform();
  
  // Check if data seems invalid (0% used on a device is impossible)
  const dataSeemsBroken = isNative && (percentUsed === 0 || (usedGb !== null && usedGb < 0.1 && totalGb !== null && totalGb > 10));
  
  const getStorageColor = () => {
    if (percentUsed === null || dataSeemsBroken) return 'text-muted-foreground';
    if (percentUsed >= 90) return 'text-destructive';
    if (percentUsed >= 80) return 'text-amber-500';
    return 'text-primary';
  };

  const getGradientColors = () => {
    if (percentUsed === null || dataSeemsBroken) return 'from-muted to-muted';
    if (percentUsed >= 90) return 'from-destructive to-destructive/70';
    if (percentUsed >= 80) return 'from-amber-500 to-amber-400';
    return 'from-primary to-primary/70';
  };

  const getBorderColor = () => {
    if (percentUsed === null || dataSeemsBroken) return 'border-border';
    if (percentUsed >= 90) return 'border-destructive/30';
    if (percentUsed >= 80) return 'border-amber-500/30';
    return 'border-primary/20';
  };

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      'bg-card/80 backdrop-blur-sm border',
      getBorderColor()
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg',
            percentUsed !== null && percentUsed >= 90 ? 'bg-destructive/20' :
            percentUsed !== null && percentUsed >= 80 ? 'bg-amber-500/20' :
            'bg-primary/20'
          )}>
            <HardDrive className={cn('h-4 w-4', getStorageColor())} />
          </div>
          Memoria Interna
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {dataSeemsBroken ? (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-700">Plugin nativo richiesto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per i dati reali dello storage, installa il plugin Android seguendo le istruzioni in <code className="bg-muted px-1 rounded">android-plugin/INSTRUCTIONS.md</code>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-muted-foreground py-2">
                <p className="text-xs">Spazio totale stimato: ~{totalGb} GB</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={cn('text-3xl font-bold', getStorageColor())}>
                  {percentUsed !== null ? `${percentUsed}%` : '--'}
                </span>
                <span className="text-xs text-muted-foreground">
                  utilizzato
                </span>
              </div>
              
              {/* Gradient progress bar */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                    getGradientColors()
                  )}
                  style={{ width: `${percentUsed || 0}%` }}
                />
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/30 backdrop-blur-sm rounded-xl py-2.5 border border-border/50">
                  <span className="block text-sm font-bold text-foreground">
                    {totalGb !== null ? totalGb.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">GB Totali</span>
                </div>
                <div className="bg-muted/30 backdrop-blur-sm rounded-xl py-2.5 border border-border/50">
                  <span className="block text-sm font-bold text-foreground">
                    {usedGb !== null ? usedGb.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">GB Usati</span>
                </div>
                <div className="bg-green-500/10 backdrop-blur-sm rounded-xl py-2.5 border border-green-500/20">
                  <span className="block text-sm font-bold text-green-600">
                    {availableGb !== null ? availableGb.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">GB Liberi</span>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
