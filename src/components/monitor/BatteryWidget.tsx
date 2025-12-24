import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BatteryWidgetProps {
  level: number | null;
  health: string | null;
  isCharging: boolean;
}

export const BatteryWidget = ({ level, health, isCharging }: BatteryWidgetProps) => {
  const getBatteryIcon = () => {
    if (isCharging) return BatteryCharging;
    if (level === null) return Battery;
    if (level >= 80) return BatteryFull;
    if (level >= 50) return BatteryMedium;
    if (level >= 20) return BatteryLow;
    return BatteryWarning;
  };

  const getBatteryColor = () => {
    if (level === null) return 'text-muted-foreground';
    if (level >= 60) return 'text-green-500';
    if (level >= 30) return 'text-amber-500';
    return 'text-destructive';
  };

  const getGradientColors = () => {
    if (level === null) return 'from-muted to-muted';
    if (level >= 60) return 'from-green-500 to-green-400';
    if (level >= 30) return 'from-amber-500 to-amber-400';
    return 'from-destructive to-red-400';
  };

  const getBorderColor = () => {
    if (level === null) return 'border-border';
    if (level >= 60) return 'border-green-500/20';
    if (level >= 30) return 'border-amber-500/30';
    return 'border-destructive/30';
  };

  const BatteryIcon = getBatteryIcon();

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300',
      'bg-card/80 backdrop-blur-sm border',
      getBorderColor()
    )}>
      {/* Charging animation overlay */}
      {isCharging && (
        <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent animate-pulse" />
      )}
      
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-lg',
            level !== null && level >= 60 ? 'bg-green-500/20' :
            level !== null && level >= 30 ? 'bg-amber-500/20' :
            level !== null ? 'bg-destructive/20' : 'bg-muted'
          )}>
            <BatteryIcon className={cn('h-4 w-4', getBatteryColor())} />
          </div>
          Batteria
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className={cn('text-3xl font-bold', getBatteryColor())}>
                {level !== null ? level : '--'}
              </span>
              <span className="text-lg text-muted-foreground">%</span>
            </div>
            {isCharging && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-600">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">In carica</span>
              </div>
            )}
          </div>
          
          {/* Gradient progress bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                getGradientColors()
              )}
              style={{ width: `${level || 0}%` }}
            />
            {/* Shimmer effect for charging */}
            {isCharging && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
          
          {health && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">Stato batteria</span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                health === 'good' ? 'bg-green-500/20 text-green-600' :
                health === 'overheat' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              )}>
                {health === 'good' ? 'Ottimale' : 
                 health === 'overheat' ? 'Surriscaldata' : 
                 health === 'cold' ? 'Fredda' : 
                 health}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
