import { Battery, BatteryCharging, BatteryLow, BatteryWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
    if (level <= 15) return BatteryLow;
    if (level <= 30) return BatteryWarning;
    return Battery;
  };

  const getBatteryColor = () => {
    if (level === null) return 'text-muted-foreground';
    if (level <= 15) return 'text-destructive';
    if (level <= 30) return 'text-amber-500';
    return 'text-green-500';
  };

  const getProgressColor = () => {
    if (level === null) return 'bg-muted';
    if (level <= 15) return 'bg-destructive';
    if (level <= 30) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const Icon = getBatteryIcon();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn('h-4 w-4', getBatteryColor())} />
          Batteria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={cn('text-3xl font-bold', getBatteryColor())}>
              {level !== null ? `${level}%` : '--'}
            </span>
            {isCharging && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <BatteryCharging className="h-3 w-3" />
                In carica
              </span>
            )}
          </div>
          
          <Progress 
            value={level || 0} 
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Stato: {health || 'Sconosciuto'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
