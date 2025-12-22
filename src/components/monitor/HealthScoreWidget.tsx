import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HealthScoreWidgetProps {
  score: number;
  lastSyncAt: Date | null;
}

export const HealthScoreWidget = ({ score, lastSyncAt }: HealthScoreWidgetProps) => {
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreBg = () => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-amber-500/10';
    return 'bg-destructive/10';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Ottimo';
    if (score >= 60) return 'Buono';
    if (score >= 40) return 'Discreto';
    return 'Critico';
  };

  const getScoreIcon = () => {
    if (score >= 80) return TrendingUp;
    if (score >= 60) return Minus;
    return TrendingDown;
  };

  const ScoreIcon = getScoreIcon();

  return (
    <Card className={cn('border-2', getScoreBg())}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className={cn('h-4 w-4', getScoreColor())} />
          Punteggio Salute
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-2">
          <div className={cn('text-5xl font-bold', getScoreColor())}>
            {score}
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <ScoreIcon className={cn('h-4 w-4', getScoreColor())} />
            <span className={cn('text-sm font-medium', getScoreColor())}>
              {getScoreLabel()}
            </span>
          </div>
          
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Ultimo sync: {lastSyncAt.toLocaleString('it-IT')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
